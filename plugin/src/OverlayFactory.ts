import { Overlay, OverlayPage } from "./Overlay.ts";
import { Reactive } from "vue";
import { toReactive } from "./helpers.ts";

export type ReactiveOverlay = Reactive<Overlay>;

export class OverlayFactory {

    // ----------[ Api ]----------

    public make(page: OverlayPage): ReactiveOverlay {
        const overlay = new Overlay({
            id: page.overlay.id,
            component: page.overlay.component,
            size: page.overlay.size,
            variant: page.overlay.variant,
            url: new URL(page.overlay.url),
            baseUrl: page.overlay.baseUrl ? new URL(page.overlay.baseUrl) : undefined,
        });

        return toReactive(overlay);
    }

}