import { ReactiveOverlay } from "./OverlayFactory.ts";
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

    public buildOverlayVisitRequest(data: Record<string, any>, options: VisitOptions = {}): RequestConfig<OverlayPage> {
        return {
            data,
            options: {
                ...options,
                async: true,
                preserveUrl: true,
                preserveState: true,
                preserveScroll: true,
                headers: {
                    ...(options.headers || {}),
                    [header.INERTIA_OVERLAY]: 'true',
                }
            }
        }
    }

    public buildOverlayActionRequest(overlay: ReactiveOverlay, action: string, options: VisitOptions = {}): RequestConfig<OverlayPage> {
        return {
            data: {
                ...(options.data || {}),
            },
            options: {
                ...options,
                preserveUrl: true,
                preserveState: true,
                preserveScroll: true,
                headers: {
                    ...(options.headers || {}),
                    [header.INERTIA_OVERLAY]: 'true',
                    [header.OVERLAY_ACTION]: action,
                    [header.OVERLAY_ID]: overlay.id,
                },
            },
            validator: this.isOverlayPage,
        }
    }

    public buildReloadRootRequest(): RequestConfig {
        return {
            options: {
                preserveState: true,
                preserveScroll: true,
            }
        }
    }

}