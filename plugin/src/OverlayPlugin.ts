import { OverlayStack } from "./OverlayStack.ts";
import { App, computed, nextTick, reactive, shallowRef } from "vue";
import { OverlayFactory, ReadonlyOverlay } from "./OverlayFactory.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { extendDeferredComponent } from "./Deferred.ts";
import { OverlayPage, OverlayProps, OverlayState } from "./Overlay.ts";
import { isOverlayPage } from "./helpers.ts";
import { usePage } from "@inertiajs/vue3";

export type OverlayComponentResolver<T = any> = (type: string) => () => Promise<T>;

export interface OverlayPluginOptions<T = any> {
    resolve: OverlayComponentResolver<T>;
}

export interface OverlayHandle {
    id: string | undefined;
    state: OverlayState;
    open: () => Promise<void>;
    close: () => Promise<void>;
}

export type OverlayResolver = (overlayId: string) => ReadonlyOverlay;

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
            handler: (event) => this.onOverlayPageLoaded(event),
            priority: -1,
        });
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
            const handle = this.createOverlayFromPage(page);
            handle.open();
        }
    }

    // ----------[ Api ]----------

    public createOverlayFromUrl(url: string, props: OverlayProps = {}): OverlayHandle {
        return this.createOverlay(() => this.factory.make({
            url: url,
            props: props,
        }));
    }

    public createOverlayFromComponent(component: string, props: OverlayProps = {}): OverlayHandle {
        return this.createOverlayFromUrl(`/overlay/${ component }`, props);
    }

    public createOverlayFromPage(page: OverlayPage): OverlayHandle {
        return this.createOverlay(() => this.factory.makeFromPage(page));
    }

    public createOverlay(create: () => ReadonlyOverlay): OverlayHandle {

        // We create a fresh overlay instance on each open() to prevent memory leaks.
        // While overlays can technically be reopened, destroying and recreating ensures
        // event listeners, subscriptions, and state are properly cleaned up. Since overlays
        // aren't children of page components, we can't rely on Vue's lifecycle hooks like
        // onUnmounted to determine when cleanup should occur, making explicit destruction
        // on each close the safer approach.

        const instance = shallowRef<ReadonlyOverlay>(null);

        return reactive({
            id: computed(() => instance.value?.id),
            state: computed(() => instance.value?.state || 'closed'),
            open: async () => {
                if (instance.value) return;
                const overlay = create();
                instance.value = this.registerInstance(overlay, () => instance.value = null);
                await instance.value.open();
            },
            close: async () => {
                if (! instance.value) return;
                await instance.value.close();
            },
        });
    }

    public resolveOverlay(overlayId: string): ReadonlyOverlay | null {
        return this.overlayInstances.get(overlayId) || null;
    }

    public resolveFocusedOverlayId(): string | null {
        return this.stack.items.find(i => i.isFocused())?.id || null;
    }

    public resolveComponent(type: string): () => Promise<any> {
        console.log('Resolving overlay component:', type);
        try {
            return this.options.resolve(type);
        } catch {
            throw new Error(`Overlay component of type "${ type }" could not be resolved.`);
        }
    }

    // ----------[ Event Handlers ]----------

    private onOverlayPageLoaded(page: OverlayPage): void {
        if (! this.overlayInstances.has(page.overlay.id)) {
            const handle = this.createOverlayFromPage(page);
            handle.open();
        }
    }

    // ----------[ Internal ]----------

    private registerInstance(overlay: ReadonlyOverlay, onClosed?: () => void): ReadonlyOverlay {

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
                    onClosed?.();
                    break;

            }
        });

        overlay.onFocused.on(() => {
            this.stack.items
                .filter(other => other.id !== overlay.id)
                .forEach(other => other.blur());
        })

        return overlay;
    }

    private resolveOverlayDataFromDocument() {
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

}