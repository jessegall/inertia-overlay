import { OverlayStack } from "./OverlayStack.ts";
import { App, nextTick } from "vue";
import { OverlayFactory, ReadonlyOverlay } from "./OverlayFactory.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { extendDeferredComponent } from "./Deferred.ts";
import { isOverlayPage } from "./helpers.ts";
import { usePage } from "@inertiajs/vue3";

export type OverlayComponentResolver<T = any> = (type: string) => () => Promise<T>;

export interface OverlayPluginOptions<T = any> {
    resolve: OverlayComponentResolver<T>;
}

export type OverlayResolver = (overlayId: string) => ReadonlyOverlay;

export interface InstanceOptions {
    onClose?: () => void;
}

export class OverlayPlugin {

    public readonly stack: OverlayStack;
    public readonly router: OverlayRouter;
    public readonly factory: OverlayFactory;

    private readonly overlayInstances = new Map<string, ReadonlyOverlay>();

    constructor(
        public readonly options: OverlayPluginOptions
    ) {
        this.stack = new OverlayStack(this.resolveOverlay.bind(this));
        this.router = new OverlayRouter(this.resolveOverlay.bind(this), this.resolveFocusedOverlayId.bind(this));
        this.factory = new OverlayFactory(this.router);
    }

    public install(app: App): void {
        this.registerBindings(app);
        this.registerListeners(app);
        this.extendComponents();

        nextTick(() => {
            this.initialize();
        })
    }

    // ----------[ Setup ]----------

    private registerBindings(app: App): void {
        app.provide('overlay.plugin', this);
        app.provide('overlay.stack', this.stack);
        app.provide('overlay.router', this.router);
        app.provide('overlay.factory', this.factory);
    }

    private registerListeners(app: App): void {
        this.router.onOverlayPageLoad.on({
            handler: (page) => {
                if (! this.overlayInstances.has(page.overlay.id)) {
                    const overlay = this.factory.makeFromPage(page);
                    this.registerInstance(overlay);
                    overlay.open();
                }
            },
            priority: -1,
        });

        this.router.onNavigated.on(() => {
            // this.stack.items.forEach(overlay => overlay.close());
        })
    }

    private extendComponents(): void {
        extendDeferredComponent(this.stack)
    }

    private initialize(): void {
        const page = usePage();
        const overlayData = this.resolveOverlayDataFromDocument();

        if (overlayData) {
            page['overlay'] = overlayData;
        }

        if (isOverlayPage(page)) {
            const overlay = this.factory.makeFromPage(page);
            this.router.cache.set(overlay.id, page);
            this.registerInstance(overlay);
            overlay.open();
        }
    }

    // ----------[ Api ]----------

    public newInstance(url: string | URL, data: Record<string, any> = {}, options: InstanceOptions = {}): ReadonlyOverlay {
        const overlay = this.factory.make(url, data);
        this.registerInstance(overlay, options);
        return overlay;
    }

    public registerInstance(overlay: ReadonlyOverlay, options: InstanceOptions = {}): void {
        this.overlayInstances.set(overlay.id, overlay);

        overlay.onStatusChange.on((status) => {
            switch (status) {

                case "opening":
                    overlay.setParentId(this.stack.peekId());
                    overlay.setIndex(this.stack.size());
                    this.stack.push(overlay.id);
                    break;

                case "closed":
                    this.stack.remove(overlay.id);
                    this.overlayInstances.delete(overlay.id);
                    overlay.destroy();

                    if (this.stack.size() > 0) {
                        const child = this.stack.items.find(i => i.parentId === overlay.id);
                        if (child) {
                            child.setParentId(null);
                            child.close();
                        }
                    }

                    options?.onClose?.();
                    break;

            }
        });

        overlay.onFocused.on(() => {
            this.stack.items
                .filter(other => other.id !== overlay.id)
                .forEach(other => other.blur());
        })
    }

    // ----------[ Internal ]----------

    public resolveOverlayDataFromDocument() {
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

    public resolveOverlay(overlayId: string): ReadonlyOverlay | null {
        return this.overlayInstances.get(overlayId) || null;
    }

    public resolveFocusedOverlayId(): string | null {
        return this.stack.items.find(i => i.isFocused())?.id || null;
    }

    public resolveComponent(type: string): () => Promise<any> {
        try {
            return this.options.resolve(type);
        } catch {
            throw new Error(`Overlay component of type "${ type }" could not be resolved.`);
        }
    }

}