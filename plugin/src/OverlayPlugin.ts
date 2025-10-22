import { OverlayStack } from "./OverlayStack.ts";
import { App, h } from "vue";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { OverlayFactory, ReadonlyOverlay } from "./OverlayFactory.ts";
import { OverlayArgs, OverlayType } from "./Overlay.ts";
import { OverlayRequest } from "./OverlayRequest.ts";

export interface OverlayPluginOptions<T = any> {
    resolve: (type: string) => () => Promise<T>;
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
        this.factory = new OverlayFactory(this.request);
    }

    public install(app: App): void {
        this.provideDependencies(app);
        this.injectOverlayRootComponent(app);
        this.setupListeners(app);
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

    private setupListeners(app: App): void {
        this.stack.onOverlayPushed.listen(overlay => this.onOverlayPushed(overlay));
    }

    // ----------[ EventHandlers ]----------

    private onOverlayPushed(overlay: ReadonlyOverlay): void {
        overlay.onStatusChange.listen((status) => {
            if (status === 'closed') {
                this.stack.remove(overlay.id);
            }
        });
    }

    // ----------[ Api ]----------

    public createOverlay(options: CreateOverlayOptions): ReadonlyOverlay {
        const overlay = this.factory.make(options.type, options.args);

        overlay.onStatusChange.listen((status) => {
            switch (status) {

                case "opening":
                    const parent = this.stack.peek();
                    const index = this.stack.size();

                    this.stack.push(overlay);

                    if (parent) {
                        overlay.setParentId(parent.id);
                    }

                    overlay.setIndex(index);

                    break;

                case "closed":
                    this.stack.remove(overlay.id);
                    break;

            }
        })

        return overlay;
    }

    public async resolveComponent<T>(type: string): Promise<T> {
        const resolver = this.options.resolve;

        if (! resolver) {
            throw new Error('Overlay component resolver not configured.');
        }

        const component = await resolver(type)?.();

        if (! component) {
            throw new Error(`Overlay component for typename "${ type }" not found.`);
        }

        if (typeof component === 'object' && 'default' in component) {
            return component.default as T;
        }

        return component as T;
    }

}