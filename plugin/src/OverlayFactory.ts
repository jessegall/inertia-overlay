import { Overlay, OverlayPage } from "./Overlay.ts";
import { randomString, toReactive } from "./helpers.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { Reactive } from "vue";
import qs from 'qs'

export type ReactiveOverlay = Reactive<Overlay>;

export class OverlayFactory {

    constructor(
        private readonly router: OverlayRouter,
    ) {}

    // ----------[ Api ]----------

    public make(url: string | URL, data: Record<string, any>): ReactiveOverlay {
        const overlay = new Overlay(this.router, {
            id: randomString(),
            url: this.makeUrl(url, data),
        });

        return toReactive(overlay);
    }

    public makeFromPage(page: OverlayPage): ReactiveOverlay {
        const overlay = new Overlay(this.router, {
            id: page.overlay.id,
            url: this.makeUrl(page.overlay.url),
        });

        return toReactive(overlay);
    }

    // ----------[ Helpers ]----------

    private makeUrl(url: string | URL, data: Record<string, any> = {}): URL {
        const baseUrl = typeof url === 'string' ? new URL(url, window.location.origin) : url;

        const queryString = qs.stringify(data, {
            arrayFormat: 'brackets',
            encode: false
        });

        return new URL(`${ baseUrl.pathname }?${ queryString }`, baseUrl.origin);
    }


}