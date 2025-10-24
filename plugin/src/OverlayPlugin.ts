import { OverlayStack } from "./OverlayStack.ts";
import { App, h } from "vue";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { CreateOverlayOptions, OverlayFactory, ReadonlyOverlay } from "./OverlayFactory.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { extendDeferredComponent } from "./Deferred.ts";

export type OverlayComponentResolver<T = any> = (type: string) => () => Promise<T>;

export interface OverlayPluginOptions<T = any> {
    resolve: OverlayComponentResolver<T>;
}


export class OverlayPlugin {

    public readonly stack: OverlayStack;
    public readonly router: OverlayRouter;
    public readonly factory: OverlayFactory;

    constructor(
        public readonly options: OverlayPluginOptions
    ) {
        this.stack = new OverlayStack();
        this.router = new OverlayRouter((overlayId: string) => this.stack.findById(overlayId));
        this.factory = new OverlayFactory(this.options.resolve, this.router);
    }

    public install(app: App): void {
        this.registerBindings(app);
        this.injectOverlayRootComponent(app);
        this.extendComponents();
        this.handleInitialPageLoad();
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

    private handleInitialPageLoad(): void {
        const overlayId = this.router.resolveOverlayQueryParam();
        if (overlayId) {
            const overlay = this.createOverlay({ id: overlayId });
            overlay.open();
        }
    }

    // ----------[ Api ]----------

    public createOverlay(options: CreateOverlayOptions): ReadonlyOverlay {
        const overlay = this.factory.make(options);
        overlay.onStatusChange.on((status) => this.handleOverlayStatusChange(overlay, status));
        return overlay;
    }

    // ----------[ EventHandlers ]----------

    private handleOverlayStatusChange(overlay: ReadonlyOverlay, status: string): void {
        switch (status) {

            case "opening":
                overlay.setParentId(this.stack.peekId());
                overlay.setIndex(this.stack.size());
                this.stack.push(overlay);
                break;

            case "closed":
                this.stack.remove(overlay.id);
                overlay.setIndex(-1);
                break;

        }
    }

}