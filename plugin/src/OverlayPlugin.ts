import { OverlayStack } from "./OverlayStack.ts";
import { App, computed, nextTick, reactive, shallowRef } from "vue";
import { OverlayFactory, ReadonlyOverlay } from "./OverlayFactory.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { extendDeferredComponent } from "./Deferred.ts";
import { OverlayOptions, OverlayPage, OverlayProps, OverlayState, OverlayType } from "./Overlay.ts";
import { Page } from "@inertiajs/core";
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

export type CreateOverlayOptions = Omit<OverlayOptions, 'id'>;

export type NewInstanceOptions = CreateOverlayOptions & {
    id?: string;
};

export type OverlayResolver = (overlayId: string) => ReadonlyOverlay;

export class OverlayPlugin {

    public readonly stack: OverlayStack;
    public readonly router: OverlayRouter;
    public readonly factory: OverlayFactory;

    private readonly overlayInstances = new Map<string, ReadonlyOverlay>();

    constructor(
        public readonly options: OverlayPluginOptions
    ) {
        this.stack = new OverlayStack((overlayId: string) => this.resolveOverlay(overlayId));
        this.router = new OverlayRouter(
            (overlayId: string) => this.resolveOverlay(overlayId),
            () => this.stack.peekId(),
        );
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
        this.router.onNavigated.on((event) => this.handleNavigated(event));

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
        if (isOverlayPage(page)) {

        }
    }

    // ----------[ Api ]----------

    public createOverlayFromComponent(component: string, props: OverlayProps = {}): OverlayHandle {
        return this.createOverlay(`/overlay/${ component }`, props, 'parameterized');
    }

    public createOverlay(url: string, props: OverlayProps = {}, type: OverlayType = 'routed'): OverlayHandle {
        const instance = shallowRef<ReadonlyOverlay>(null);

        // We create a fresh overlay instance on each open() to prevent memory leaks.
        // While overlays can technically be reopened, destroying and recreating ensures
        // event listeners, subscriptions, and state are properly cleaned up. Since overlays
        // aren't children of page components, we can't rely on Vue's lifecycle hooks like
        // onUnmounted to determine when cleanup should occur, making explicit destruction
        // on each close the safer approach.

        return reactive({
            id: computed(() => instance.value?.id),
            state: computed(() => instance.value?.state || 'closed'),
            open: async () => {
                if (instance.value) return;
                instance.value = this.newOverlayInstance({ url, props, type }, () => instance.value = null);
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

    // ----------[ Internal ]----------

    private newOverlayInstance(options: NewInstanceOptions, onClosed?: () => void): ReadonlyOverlay {
        const overlay = this.factory.make(options);
        this.overlayInstances.set(overlay.id, overlay);

        overlay.onStatusChange.on((status) => {

            console.log(overlay.id, status);

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

        return overlay;
    }

    // ----------[ Event Handlers ]----------

    private handleNavigated(page: Page): void {
        if (! isOverlayPage(page) && this.stack.size() === 0) {
            this.router.setRootUrl(this.router.currentUrl.href);
        }
    }

    private onOverlayPageLoaded(page: OverlayPage): void {
        if (! this.overlayInstances.has(page.overlay.id)) {
            const overlay = this.newOverlayInstance(page.overlay);
            overlay.open(page);
        }
    }

}