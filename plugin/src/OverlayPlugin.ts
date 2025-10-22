import { OverlayStack } from "./OverlayStack.ts";
import { App, h } from "vue";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { OverlayFactory, ReadonlyOverlay } from "./OverlayFactory.ts";
import { OverlayArgs, OverlayType } from "./Overlay.ts";
import { OverlayRequest } from "./OverlayRequest.ts";

export type OverlayComponentResolver<T = any> = (type: string) => () => Promise<T>;

export interface OverlayPluginOptions<T = any> {
    resolve: OverlayComponentResolver<T>;
}

export interface CreateOverlayOptions {
    type: OverlayType;
    args: OverlayArgs
}

export class OverlayPlugin {

    private readonly stack: OverlayStack;
    private readonly request: OverlayRequest;
    private readonly factory: OverlayFactory;

    constructor(
        public readonly options: OverlayPluginOptions
    ) {
        this.stack = new OverlayStack();
        this.request = new OverlayRequest((overlayId: string) => this.stack.findById(overlayId));
        this.factory = new OverlayFactory(this.options.resolve, this.request);
    }

    public install(app: App): void {
        this.provideDependencies(app);
        this.injectOverlayRootComponent(app);
    }

    // ----------[ Setup ]----------

    private provideDependencies(app: App): void {
        app.provide('overlay.plugin', this);
        app.provide('overlay.stack', this.stack);
        app.provide('overlay.request', this.request);
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

    // ----------[ Api ]----------

    public createOverlay(options: CreateOverlayOptions): ReadonlyOverlay {
        const overlay = this.factory.make(options.type, options.args);
        overlay.onStatusChange.listen((status) => this.handleOverlayStatusChange(overlay, status));
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