import { OverlayStack } from "./OverlayStack.ts";
import { App, h } from "vue";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { OverlayFactory } from "./OverlayFactory.ts";
import { Overlay } from "./Overlay.ts";

export interface OverlayPluginOptions<T = any> {
    resolve: (type: string) => () => Promise<T>;
}

export class OverlayPlugin {

    private readonly stack: OverlayStack = new OverlayStack();
    private readonly factory: OverlayFactory = new OverlayFactory();

    constructor(
        public readonly options: OverlayPluginOptions
    ) {
        this.stack.onOverlayPushed.listen(overlay => this.onOverlayPushed(overlay));
    }

    public install(app: App): void {
        this.provideDependencies(app);
        this.injectOverlayRootComponent(app);
    }

    // ----------[ Setup ]----------

    private provideDependencies(app: App): void {
        app.provide('overlay.plugin', this);
        app.provide('overlay.stack', this.stack);
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

    // ----------[ EventHandlers ]----------

    private onOverlayPushed(overlay: Overlay): void {
        overlay.onFocused.listen(() => this.onOverlayFocused(overlay));
        overlay.onStatusChange.listen((status) => {
            if (status === 'closed') {
                this.stack.remove(overlay.id);
            }
        });
    }

    private onOverlayFocused(overlay: Overlay): void {
        if (this.stack.size() <= 1) {
            return;
        }
        const index = this.stack.overlays.value.findIndex(o => o.id === overlay.id);
        const previousOverlay = this.stack.overlays.value[index - 1];
        previousOverlay.blur();
    }

    // ----------[ Api ]----------

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