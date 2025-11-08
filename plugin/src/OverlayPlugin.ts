import { OverlayStack } from "./OverlayStack.ts";
import { App } from "vue";
import { OverlayFactory, ReactiveOverlay } from "./OverlayFactory.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { extendDeferredComponent } from "./Deferred.ts";
import { OverlayManager } from "./OverlayManager.ts";

export type OverlayComponentResolver<T = any> = (type: string) => () => Promise<T>;

export interface OverlayPluginOptions<T = any> {
    resolve: OverlayComponentResolver<T>;
}

export type OverlayResolver = (overlayId: string) => ReactiveOverlay;

export interface InstanceOptions {
    data?: Record<string, any>;
    onClose?: () => void;
}

export class OverlayPlugin {

    public readonly factory: OverlayFactory;
    public readonly stack: OverlayStack;
    public readonly router: OverlayRouter;
    public readonly manager: OverlayManager;

    // ----------[ Constructor ]----------

    constructor(public readonly options: OverlayPluginOptions) {
        const overlayResolver = (overlayId: string) => this.manager.resolve(overlayId);

        this.factory = new OverlayFactory();
        this.stack = new OverlayStack(overlayResolver);
        this.router = new OverlayRouter(this.stack);
        this.manager = new OverlayManager(this.stack, this.router, this.factory);
    }

    // ----------[ Installation ]----------

    public install(app: App): void {
        this.registerBindings(app);
        this.extendComponents();
    }

    private registerBindings(app: App): void {
        app.provide('overlay.plugin', this);
        app.provide('overlay.stack', this.stack);
        app.provide('overlay.router', this.router);
        app.provide('overlay.factory', this.factory);
    }

    private extendComponents(): void {
        extendDeferredComponent(this.stack);
    }

    // ----------[ Public API ]----------

    public async visitOverlay(url: string | URL, options: InstanceOptions = {}): Promise<ReactiveOverlay> {
        const page = await this.router.visit(url, options.data || {});
        const overlay = this.manager.instances.get(page.overlay.id);

        if (options.onClose) {
            overlay.onClose.listen(options.onClose);
        }

        return overlay;
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

    public resolveComponent(type: string): () => Promise<any> {
        try {
            return this.options.resolve(type);
        } catch {
            throw new Error(`Overlay component of type "${ type }" could not be resolved.`);
        }
    }

}