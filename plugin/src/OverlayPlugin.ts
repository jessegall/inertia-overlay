import { OverlayStack } from "./OverlayStack.ts";
import { App, nextTick } from "vue";
import { OverlayFactory, ReactiveOverlay } from "./OverlayFactory.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { extendDeferredComponent } from "./Deferred.ts";
import { isOverlayPage } from "./helpers.ts";
import { usePage } from "@inertiajs/vue3";

export type OverlayComponentResolver<T = any> = (type: string) => () => Promise<T>;

export interface OverlayPluginOptions<T = any> {
    resolve: OverlayComponentResolver<T>;
}

export type OverlayResolver = (overlayId: string) => ReactiveOverlay;

export interface InstanceOptions {
    onClosed?: () => void;
}

export class OverlayPlugin {

    public readonly stack: OverlayStack;
    public readonly router: OverlayRouter;
    public readonly factory: OverlayFactory;

    private readonly instances = new Map<string, ReactiveOverlay>();

    // ----------[ Constructor ]----------

    constructor(public readonly options: OverlayPluginOptions) {
        this.stack = new OverlayStack(this.resolveOverlay.bind(this));
        this.router = new OverlayRouter(this.resolveOverlay.bind(this), this.resolveFocusedOverlayId.bind(this));
        this.factory = new OverlayFactory(this.router);
    }

    // ----------[ Installation ]----------

    public install(app: App): void {
        this.registerBindings(app);
        this.registerListeners();
        this.extendComponents();
        nextTick(() => this.initialize());
    }

    private registerBindings(app: App): void {
        app.provide('overlay.plugin', this);
        app.provide('overlay.stack', this.stack);
        app.provide('overlay.router', this.router);
        app.provide('overlay.factory', this.factory);
    }

    private registerListeners(): void {
        this.router.onOverlayPageLoad.listen({
            handler: async (page) => {
                if (! this.instances.has(page.overlay.id)) {
                    const overlay = this.factory.makeFromPage(page);
                    this.registerInstance(overlay);
                    await overlay.initialize();
                    await overlay.open();
                }
            },
            priority: 99,
        });
    }

    private extendComponents(): void {
        extendDeferredComponent(this.stack);
    }

    private async initialize(): Promise<void> {
        const page = usePage();
        const overlayData = this.resolveOverlayDataFromDocument();

        if (overlayData) {
            page['overlay'] = overlayData;
        }

        if (isOverlayPage(page)) {
            const overlay = this.factory.makeFromPage(page);
            this.router.cache.set(overlay.id, page);
            this.registerInstance(overlay);
            await overlay.initialize();
            await overlay.open();
        }
    }

    // ----------[ Public API ]----------

    public newInstance(url: string | URL, data: Record<string, any> = {}, options: InstanceOptions = {}): ReactiveOverlay {
        const overlay = this.factory.make(url, data);
        this.registerInstance(overlay, options);
        return overlay;
    }

    public registerInstance(overlay: ReactiveOverlay, options: InstanceOptions = {}): void {
        this.instances.set(overlay.id, overlay);

        overlay.onFocused.listen(() => this.blurOthers(overlay.id));

        overlay.onStatusChange.listen((status) => {
            switch (status) {
                case 'initializing':
                    overlay.focus();
                    break;

                case 'opening':
                    this.handleOpening(overlay);
                    break;

                case 'closed':
                    this.handleClosed(overlay, options);
                    break;
            }
        });
    }

    // ----------[ Internal ]----------

    private handleOpening(overlay: ReactiveOverlay): void {
        const parent = this.stack.peek();
        if (parent) {
            overlay.parentId = parent.id;
            parent.blur();
        }
        overlay.index = this.stack.size();
        overlay.focus();
        this.stack.push(overlay.id);
    }

    private handleClosed(overlay: ReactiveOverlay, options: InstanceOptions): void {
        options?.onClosed?.();

        const child = this.stack.items.find(i => i.parentId === overlay.id);
        if (child) {
            child.parentId = null;
            child.close();
        }

        if (overlay.focused) {
            const parent = this.stack.items.find(i => i.id === overlay.parentId);
            parent?.focus();
        }

        this.stack.remove(overlay.id);
        this.instances.delete(overlay.id);
        overlay.destroy();

        const rootUrl = this.router.resolveRootUrl();
        if (this.stack.size() === 0 && overlay.baseUrl?.href === rootUrl.href) {
            this.router.reloadRoot();
        }
    }

    private blurOthers(overlayId: string): void {
        this.stack.items.forEach(overlay => {
            if (overlay.id !== overlayId) {
                overlay.blur();
            }
        });
    }

    private resolveOverlayDataFromDocument(): any {
        const element = document.querySelector('[data-page]');
        const content = element?.getAttribute('data-page');
        if (! content) return null;

        try {
            const data = JSON.parse(decodeURIComponent(content));
            return data['overlay'] || null;
        } catch {
            return null;
        }
    }

    private resolveOverlay(overlayId: string): ReactiveOverlay | null {
        return this.instances.get(overlayId) || null;
    }

    private resolveFocusedOverlayId(): string | null {
        return Array.from(this.instances.values()).find(i => i.focused)?.id || null;
    }

    public resolveComponent(type: string): () => Promise<any> {
        try {
            return this.options.resolve(type);
        } catch {
            throw new Error(`Overlay component of type "${ type }" could not be resolved.`);
        }
    }

}