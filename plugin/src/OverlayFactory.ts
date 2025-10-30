import { Overlay, OverlayPage } from "./Overlay.ts";
import { randomString, toReadonly } from "./helpers.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { Reactive } from "vue";
import qs from 'qs'

export type ReadonlyOverlay = Readonly<Reactive<Overlay>>;

export class OverlayFactory {

    constructor(
        private readonly router: OverlayRouter,
    ) {}

    // ----------[ Api ]----------

    public make(url: string | URL, data: Record<string, any>): ReadonlyOverlay {
        const overlay = new Overlay(this.router, {
            id: randomString(),
            url: this.makeUrl(url, data),
        });

        return toReadonly(overlay);
    }

    public makeFromPage(page: OverlayPage): ReadonlyOverlay {
        const overlay = new Overlay(this.router, {
            id: page.overlay.id,
            url: this.makeUrl(page.overlay.url),
        });

        return toReadonly(overlay);
    }

    // ----------[ Helpers ]----------

    private makeUrl(url: string | URL, data: Record<string, any> = {}): URL {
        const baseUrl = typeof url === 'string' ? new URL(url, window.location.origin) : url;

        const queryString = qs.stringify(data, {
            arrayFormat: 'brackets',
            encode: false
        });

        console.log(data, queryString);

        return new URL(`${ baseUrl.pathname }?${ queryString }`, baseUrl.origin);
    }


}