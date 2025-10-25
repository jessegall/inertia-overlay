import { OverlayStack } from "./OverlayStack.ts";
import { App, computed, ComputedRef, h, nextTick, ref } from "vue";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { CreateOverlayOptions, OverlayFactory, ReadonlyOverlay } from "./OverlayFactory.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { extendDeferredComponent } from "./Deferred.ts";
import { OverlayState } from "./Overlay.ts";

export type OverlayComponentResolver<T = any> = (type: string) => () => Promise<T>;

export interface OverlayPluginOptions<T = any> {
    resolve: OverlayComponentResolver<T>;
}

export interface OverlayHandle {
    open: () => Promise<void>;
    close: () => Promise<void>;
    state: ComputedRef<OverlayState>;
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
        this.stack = new OverlayStack((overlayId: string) => this.resolveOverlay(overlayId));
        this.router = new OverlayRouter((overlayId: string) => this.resolveOverlay(overlayId));
        this.factory = new OverlayFactory(this.options.resolve, this.router);
    }

    public install(app: App): void {
        this.registerBindings(app);
        this.injectOverlayRootComponent(app);
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

    private injectOverlayRootComponent(app: any) {
        const originalRender = app._component.render;
        app._component.render = function () {
            return h('div', null, [
                originalRender.call(this),
                h(OverlayRoot)
            ]);
        };
    }

    private extendComponents(): void {
        extendDeferredComponent(this.stack)
    }

    private initialize(): void {
        const overlayId = this.router.resolveOverlayQueryParam();
        if (overlayId) {
            const overlay = this.createOverlay({ id: overlayId });
            overlay.open();
        }
    }

    // ----------[ Api ]----------

    public createOverlay(options: CreateOverlayOptions): OverlayHandle {
        const instanceId = ref<string>(null);

        const hasInstance = () => {
            return instanceId.value !== null && this.overlayInstances.has(instanceId.value);
        }

        // We create a fresh overlay instance on each open() to prevent memory leaks.
        // While overlays can technically be reopened, destroying and recreating ensures
        // event listeners, subscriptions, and state are properly cleaned up. Since overlays
        // aren't children of page components, we can't rely on Vue's lifecycle hooks like
        // onUnmounted to determine when cleanup should occur, making explicit destruction
        // on each close the safer approach.

        return {
            open: async () => {
                if (hasInstance()) return;
                const instance = this.newOverlayInstance(options);
                instanceId.value = instance.id;
                await instance.open();
            },
            close: async () => {
                if (! hasInstance()) return;
                const instance = this.resolveOverlay(instanceId.value);
                await instance.close();
            },
            state: computed(() => hasInstance() ? this.resolveOverlay(instanceId.value).state : "closed"),
        };
    }

    public resolveOverlay(overlayId: string): ReadonlyOverlay | null {
        return this.overlayInstances.get(overlayId) || null;
    }

    // ----------[ Internal ]----------

    private newOverlayInstance(options: CreateOverlayOptions): ReadonlyOverlay {
        const overlay = this.factory.make(options);
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
                    break;

            }
        });

        return overlay;
    }

}