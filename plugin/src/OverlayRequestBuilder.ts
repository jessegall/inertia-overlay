import { ReadonlyOverlay } from "./OverlayFactory.ts";
import { header } from "./OverlayRouter.ts";
import { Page, VisitOptions } from "@inertiajs/core";
import { OverlayPage } from "./Overlay.ts";

export interface RequestConfig<T extends Page = Page> {
    data?: Record<string, any>;
    options: VisitOptions;
    validator?: (page: Page) => page is T;
}

export class OverlayRequestBuilder {

    private isOverlayPage(page: Page): page is OverlayPage {
        if (! page['overlay']) {
            throw new Error('The response is not an overlay page.');
        }
        return true;
    }

    public buildOverlayOpenRequest(overlay: ReadonlyOverlay): RequestConfig<OverlayPage> {
        return {
            data: {
                ...overlay.initialProps,
                _props: Object.keys(overlay.initialProps).join(','),
            },
            options: {
                preserveUrl: true,
                preserveState: true,
                preserveScroll: true,
                headers: {
                    [header.INERTIA_OVERLAY]: 'true',
                    [header.OVERLAY_OPENING]: 'true',
                    [header.OVERLAY_ID]: overlay.id,
                },
            },
            validator: this.isOverlayPage,
        }
    }

    public buildOverlayActionRequest(overlay: ReadonlyOverlay, action: string, payload: Record<string, any> = {}): RequestConfig<OverlayPage> {
        return {
            data: {
                ...payload,
            },
            options: {
                preserveUrl: true,
                preserveState: true,
                preserveScroll: true,
                headers: {
                    [header.INERTIA_OVERLAY]: 'true',
                    [header.OVERLAY_ACTION]: action,
                    [header.OVERLAY_ID]: overlay.id,
                },
            },
            validator: this.isOverlayPage,
        }
    }

    public buildNavigateToRootRequest(): RequestConfig {
        return {
            options: {
                preserveState: true,
                preserveScroll: true,
            }
        }
    }

}