import { router, usePage, } from "@inertiajs/vue3";
import { EventEmitter } from "./event.ts";
import { ActiveVisit, Page, PendingVisit, VisitOptions } from "@inertiajs/core";
import { OverlayPage } from "./Overlay.ts";
import { deepToRaw, isOverlayPage } from "./helpers.ts";
import { OverlayResolver } from "./OverlayPlugin.ts";
import { OverlayRequestBuilder } from "./OverlayRequestBuilder.ts";
import { InertiaRouterAdapter } from "./InertiaRouterAdapter.ts";
import { OverlayCache } from "./OverlayCache.ts";
import { ReactiveOverlay } from "./OverlayFactory.ts";

export const header = {

    // -----[ Inertia ]-----

    INERTIA: 'X-Inertia',
    PARTIAL_ONLY: 'X-Inertia-Partial-Data',

    // -----[ General ]-----

    INERTIA_OVERLAY: 'X-Inertia-Overlay',
    PAGE_COMPONENT: 'X-Inertia-Overlay-Page-Component',

    // -----[ Identification ]-----

    OVERLAY_COMPONENT: 'X-Inertia-Overlay-Component',
    OVERLAY_ID: 'X-Inertia-Overlay-Id',
    OVERLAY_URL: 'X-Inertia-Overlay-Url',
    OVERLAY_METHOD: 'X-Inertia-Overlay-Method',
    OVERLAY_PARENT: 'X-Inertia-Overlay-Parent',
    BASE_URL: 'X-Inertia-Overlay-Base-Url',
    OVERLAY_ACTION: 'X-Inertia-Overlay-Action',

    // -----[ Lifecycle ]-----

    OVERLAY_INITIALIZING: 'X-Inertia-Overlay-Initializing',

}

export class OverlayRouter {

    public readonly cache = new OverlayCache();
    private readonly requestBuilder = new OverlayRequestBuilder();
    private readonly routerAdapter = new InertiaRouterAdapter();

    // ----------[ Events ]----------

    public readonly onBeforeRouteVisit = new EventEmitter<PendingVisit>();
    public readonly onBeforeRouteUpdate = new EventEmitter<Page>();
    public readonly onSuccessfulRouteVisit = new EventEmitter<Page>();
    public readonly onFinishedRouteVisit = new EventEmitter<ActiveVisit>();
    public readonly onOverlayPageLoad = new EventEmitter<OverlayPage>();
    public readonly onNavigated = new EventEmitter<Page>();

    // ----------[ Properties ]----------

    private baseUrl: URL = new URL(window.location.href);

    constructor(
        private readonly overlayResolver: OverlayResolver,
        private readonly focusedOverlayId: () => string | null,
    ) {
        this.setupEvents();
        this.setupListeners();
    }

    // ----------[ Setup ]----------

    private setupEvents(): void {
        router.on('before', event => this.onBeforeRouteVisit.emit(event.detail.visit));
        router.on('beforeUpdate', event => this.onBeforeRouteUpdate.emit(event.detail.page));
        router.on('success', event => this.onSuccessfulRouteVisit.emit(event.detail.page));
        router.on('finish', event => this.onFinishedRouteVisit.emit(event.detail.visit));
        router.on('navigate', event => this.onNavigated.emit(event.detail.page));
    }

    private setupListeners(): void {
        this.onBeforeRouteVisit.listen({
            handler: visit => {
                this.prepareRouteVisit(visit);
            },
            priority: -1
        });

        this.onBeforeRouteUpdate.listen({
            handler: page => {
                if (isOverlayPage(page)) {
                    this.cache.set(page.overlay.id, page);
                    this.preservePageDetails(page);
                }
            },
            priority: -1
        });

        this.onSuccessfulRouteVisit.listen({
            handler: page => {
                if (isOverlayPage(page)) {
                    this.onOverlayPageLoad.emit(page);
                } else {
                    this.baseUrl = new URL(page.url, this.baseUrl);
                }
            },
            priority: -1
        });
    }

    // ----------[ Api ]----------

    public async fetch(overlayId: string): Promise<OverlayPage> {
        const overlay = this.overlayResolver(overlayId);
        if (! overlay) throw new Error(`Failed to fetch overlay. Overlay with ID "${ overlayId }" not found.`)

        if (this.cache.has(overlay.id)) {
            return this.cache.get(overlay.id);
        }

        const request = this.requestBuilder.buildOverlayInitializeRequest(overlay);
        return await this.routerAdapter.get(overlay.url, request);
    }

    public async action(overlayId: string, action: string, options: VisitOptions): Promise<Page> {
        const overlay = this.overlayResolver(overlayId);
        const request = this.requestBuilder.buildOverlayActionRequest(overlay, action, options);
        const url = new URL(`/overlay/${ action }`, window.location.origin);
        return await this.routerAdapter.post(url, request);
    }

    public async reloadRoot(): Promise<Page> {
        const rootUrl = this.resolveRootUrl();
        const request = this.requestBuilder.buildReloadRootRequest();
        return await this.routerAdapter.get(rootUrl, request);
    }

    // ----------[ Internal ]----------


    private prepareRouteVisit(visit: PendingVisit): void {
        const page = usePage();
        const overlayId = this.focusedOverlayId();
        const overlay = overlayId ? this.overlayResolver(overlayId) : null;

        visit.headers[header.PAGE_COMPONENT] = page.component;
        visit.headers[header.BASE_URL] = this.baseUrl.href;

        if (overlay && ! overlay.hasState('closing')) {
            visit.headers[header.INERTIA_OVERLAY] = 'true';

            visit.headers[header.OVERLAY_COMPONENT] = overlay.component;
            visit.headers[header.OVERLAY_METHOD] = overlay.method;
            visit.headers[header.OVERLAY_URL] = overlay.url.href;
            visit.headers[header.OVERLAY_ID] = overlay.id;

            if (overlay.parentId) {
                visit.headers[header.OVERLAY_PARENT] = overlay.parentId;
            }

            visit.preserveScroll = true;
            visit.preserveState = true;

            if (this.isPageReload(visit)) {
                this.restoreOverlayUrl(visit, overlay);
            }

            if (visit.only.length > 0) {
                this.removeScopeFromPartialProps(visit, overlay);
            }
        }
    }

    private restoreOverlayUrl(visit: PendingVisit, overlay: ReactiveOverlay): void {
        // When reloading the page while an overlay is open, redirect the request
        // to the overlay's URL instead of the underlying page URL
        visit.url.pathname = overlay.url.pathname;

        // Restore overlay's original query params to ensure overlay loads with the same state.
        // Visit params take precedence to allow dynamic updates during reload.
        for (const [key, value] of overlay.url.searchParams.entries()) {
            if (! visit.url.searchParams.has(key)) {
                visit.url.searchParams.set(key, value);
            }
        }
    }

    private removeScopeFromPartialProps(visit: PendingVisit, overlay: ReactiveOverlay): void {
        visit.only = visit.only.map(key => overlay.unscope(key));
    }

    private preservePageDetails(page: OverlayPage): void {
        // Keep browser URL on the root page instead of showing overlay URL
        page.url = this.baseUrl.pathname + this.baseUrl.search;

        // Backend-initiated overlays trigger full page updates, replacing all props.
        // We manually merge previous page props to preserve the underlying page state.
        const previousPageProps = deepToRaw(usePage().props);
        for (const key in previousPageProps) {
            if (! page.props.hasOwnProperty(key)) {
                page.props[key] = previousPageProps[key];
            }
        }
    }

    // ----------[ Helpers ]----------

    private hasActiveOverlays(): boolean {
        return this.focusedOverlayId() !== null;
    }

    private isPageReload(visit: PendingVisit): boolean {
        const page = usePage();
        const pageUrl = new URL(page.url, visit.url.origin);
        return visit.method === 'get' && visit.url.pathname === pageUrl.pathname;
    }

    public resolveRootUrl(): URL {
        return this.baseUrl;
    }

}