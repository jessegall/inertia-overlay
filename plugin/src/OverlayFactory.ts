import { Overlay, OverlayConfig, OverlayOptions, OverlayPage } from "./Overlay.ts";
import { randomString, toReadonly } from "./helpers.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { Reactive } from "vue";

export type ReadonlyOverlay = Readonly<Reactive<Overlay>>;
export type MakeOverlayOptions = Omit<OverlayOptions, 'id' | 'config'> & {
    id?: string;
    config?: Partial<OverlayConfig>
}

export class OverlayFactory {

    constructor(
        private readonly router: OverlayRouter,
    ) {}

    // ----------[ Api ]----------

    public make(options: MakeOverlayOptions): ReadonlyOverlay {
        const overlay = new Overlay(this.router, {
            id: randomString(),
            ...options,
        });

        return toReadonly(overlay);
    }

    public makeFromPage(page: OverlayPage): ReadonlyOverlay {
        const overlayId = page.overlay.id;
        const props: Record<string, any> = {};

        for (const [key, value] of Object.entries(page.props)) {
            if (key.startsWith(overlayId)) {
                const [, _key] = key.split(':');
                props[_key] = value
            }
        }

        this.router.cache.set(overlayId, page);

        return this.make({
            ...page.overlay,
            input: page.overlay.input,
            baseUrl: page.overlay.baseUrl,
            props,
        });
    }

}