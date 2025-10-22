import { router, usePage } from "@inertiajs/vue3";
import { EventEmitter } from "./event.ts";
import { Page, PendingVisit } from "@inertiajs/core";
import { OverlayPage } from "./Overlay.ts";
import { isOverlayPage } from "./helpers.ts";
import { ref } from "vue";
import { ReadonlyOverlay } from "./OverlayFactory.ts";

type OverlayResolver = (overlayId: string) => ReadonlyOverlay;

export const headers = {
    OVERLAY: 'X-Inertia-Overlay',
    OVERLAY_ROOT_URL: 'X-Inertia-Overlay-Root-Url',
    OVERLAY_PAGE_COMPONENT: 'X-Inertia-Overlay-Page-Component',
    OVERLAY_ID: 'X-Inertia-Overlay-Id',
    OVERLAY_INDEX: 'X-Inertia-Overlay-Index',
    OVERLAY_STATE: 'X-Inertia-Overlay-State',
    OVERLAY_PARENT_ID: 'X-Inertia-Overlay-Parent-Id',
}

export class OverlayRouter {

    // ----------[ Events ]----------

    public readonly onBeforeRouteVisit = new EventEmitter<PendingVisit>();
    public readonly onSuccessfulRouteVisit = new EventEmitter<Page>();
    public readonly onOverlayPageLoad = new EventEmitter<OverlayPage>();

    // ----------[ Properties ]----------

    private readonly rootUrl = ref<string | null>(null)

    constructor(
        private readonly resolve: OverlayResolver,
    ) {
        this.setupDispatchers();
        this.setupListeners();
    }

    // ----------[ Setup ]----------

    private setupDispatchers(): void {
        router.on('before', event => this.onBeforeRouteVisit.emit(event.detail.visit));
        router.on('success', event => this.onSuccessfulRouteVisit.emit(event.detail.page));
    }

    private setupListeners(): void {
        this.onBeforeRouteVisit.on(visit => this.handleBeforeRouteVisit(visit));
        this.onSuccessfulRouteVisit.on(page => this.handleSuccessfulRouteVisit(page));
    }

    // ----------[ Api ]----------

    public async open(overlayId: string): Promise<OverlayPage> {
        return await new Promise((resolve, reject) => router.reload({
            data: {
                overlay: overlayId,
            },
            onSuccess: (page) => {
                if (isOverlayPage(page)) {
                    resolve(page);
                } else {
                    reject(new Error('Invalid overlay page response.'));
                }
            },
            onError: (error) => {
                reject(error);
            },
        }));
    }

    public async navigateToRoot(): Promise<Page> {
        if (! this.rootUrl.value) {
            throw new Error('No root URL stored for overlay request.');
        }

        return await new Promise(resolve => router.visit(this.rootUrl.value,
            {
                onSuccess: (page) => {
                    resolve(page);
                }
            }
        ));
    }

    public setRootUrl(url: string): void {
        const _url = new URL(url);
        _url.searchParams.delete('overlay');
        this.rootUrl.value = _url.toString();
    }

    public clearRootUrl(): void {
        this.rootUrl.value = null;
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const overlayId = visit.method === 'get'
            ? visit.url.searchParams.get("overlay")
            : new URL(window.location.href).searchParams.get("overlay");
        
        if (overlayId) {
            const overlay = this.resolve(overlayId);

            if (! overlay) {
                throw new Error(`Could not resolve overlay with ID '${ overlayId }'.`);
            }

            if (! this.rootUrl.value) {
                this.setRootUrl(window.location.href);
            }

            const page = usePage();

            visit.headers = {

                ...visit.headers,

                // -----[ Overlay Headers ]-----

                [headers.OVERLAY]: 'true',
                [headers.OVERLAY_ID]: overlay.id,
                [headers.OVERLAY_INDEX]: overlay.index.toString(),
                [headers.OVERLAY_STATE]: overlay.state,
                [headers.OVERLAY_PARENT_ID]: overlay.parentId,
                [headers.OVERLAY_PAGE_COMPONENT]: page.component,
                [headers.OVERLAY_ROOT_URL]: this.rootUrl.value,

            }

            if (visit.only.length === 0) {
                visit.only = ['__overlay_partial_reload_trigger']
            }
        } else {
            this.clearRootUrl();
        }
    }

    private handleSuccessfulRouteVisit(page: Page): void {
        if (isOverlayPage(page)) {
            this.onOverlayPageLoad.emit(page);
        }
    }

}