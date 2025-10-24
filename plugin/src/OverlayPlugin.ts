import { OverlayStack } from "./OverlayStack.ts";
import { App, h } from "vue";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { OverlayFactory, ReadonlyOverlay } from "./OverlayFactory.ts";
import { OverlayArgs, OverlayType } from "./Overlay.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { extendDeferredComponent } from "./Deferred.ts";

export type OverlayComponentResolver<T = any> = (type: string) => () => Promise<T>;

export interface OverlayPluginOptions<T = any> {
    resolve: OverlayComponentResolver<T>;
}

export type CreateOverlayOptions = {
    type: OverlayType;
    args: OverlayArgs
} | {
    id: string;
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
        this.provideDependencies(app);
        this.injectOverlayRootComponent(app);
        this.extendComponents(app);
        this.handleInitialPageLoad();
    }

    // ----------[ Setup ]----------

    private provideDependencies(app: App): void {
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

    private extendComponents(app: App): void {
        extendDeferredComponent(this.stack)
    }

    private handleInitialPageLoad(): void {
        const overlayId = this.router.getOverlayQueryParam();

        if (overlayId) {
            const overlay = this.createOverlay({ id: overlayId });
            overlay.open();
        }
    }

    // ----------[ Api ]----------

    public createOverlay(options: CreateOverlayOptions): ReadonlyOverlay {
        const overlay = 'id' in options ?
            this.factory.makeFromId(options.id) :
            this.factory.make(options.type, options.args);

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

            case 'closing':
                break;

            case "closed":
                this.stack.remove(overlay.id);
                overlay.setIndex(-1);
                break;

        }
    }

}