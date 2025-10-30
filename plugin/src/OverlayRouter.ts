import { router, usePage, } from "@inertiajs/vue3";
import { EventEmitter } from "./event.ts";
import { ActiveVisit, Page, PendingVisit } from "@inertiajs/core";
import { OverlayPage } from "./Overlay.ts";
import { deepToRaw, isOverlayPage } from "./helpers.ts";
import { OverlayResolver } from "./OverlayPlugin.ts";
import { OverlayRequestBuilder } from "./OverlayRequestBuilder.ts";
import { InertiaRouterAdapter } from "./InertiaRouterAdapter.ts";
import { OverlayCache } from "./OverlayCache.ts";
import { ReadonlyOverlay } from "./OverlayFactory.ts";

export const header = {

    // -----[ General ]-----

    INERTIA_OVERLAY: 'X-Inertia-Overlay',
    PAGE_COMPONENT: 'X-Inertia-Overlay-Page-Component',

    // -----[ Identification ]-----

    OVERLAY_ID: 'X-Inertia-Overlay-Id',
    OVERLAY_URL: 'X-Inertia-Overlay-Url',
    OVERLAY_BASE_URL: 'X-Inertia-Overlay-Base-Url',
    OVERLAY_ACTION: 'X-Inertia-Overlay-Action',

    // -----[ Lifecycle ]-----

    OVERLAY_OPENING: 'X-Inertia-Overlay-Opening',

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
        this.onBeforeRouteVisit.on({
            handler: visit => {
                this.prepareRouteVisit(visit);
            },
            priority: -1
        });

        this.onBeforeRouteUpdate.on({
            handler: page => {
                if (isOverlayPage(page)) {
                    this.cache.set(page.overlay.id, page);
                    this.preservePageDetails(page);
                }
            },
            priority: -1
        });

        this.onSuccessfulRouteVisit.on({
            handler: page => {
                if (isOverlayPage(page)) {
                    this.onOverlayPageLoad.emit(page);
                    this.baseUrl = new URL(page.overlay.baseUrl);
                } else {
                    this.baseUrl = new URL(page.url, this.baseUrl);
                }
            },
            priority: -1
        });
    }

    // ----------[ Api ]----------

    public async open(overlayId: string): Promise<OverlayPage> {
        const overlay = this.overlayResolver(overlayId);
        if (! overlay) {
            throw new Error(`Failed to open overlay. Overlay with ID "${ overlayId }" not found.`)
        }

        overlay.focus();

        if (this.cache.has(overlay.id)) {
            return this.cache.get(overlay.id);
        }

        const request = this.requestBuilder.buildOverlayOpenRequest(overlay);
        return await this.routerAdapter.get(overlay.url, request);
    }

    public async action(overlayId: string, action: string, payload: Record<string, any> = {}): Promise<Page> {
        const page = this.cache.get(overlayId);
        const overlay = this.overlayResolver(overlayId);
        const request = this.requestBuilder.buildOverlayActionRequest(overlay, action, payload);
        return await this.routerAdapter.method(page.overlay.method, overlay.url, request);
    }

    public async navigateToRoot(): Promise<Page> {
        const page = usePage();
        const rootUrl = this.resolveRootUrl();
        const currentUrl = new URL(page.url, rootUrl);

        if (rootUrl.href === currentUrl.href) {
            return page;
        }

        const request = this.requestBuilder.buildNavigateToRootRequest();
        return await this.routerAdapter.get(rootUrl, request);
    }

    // ----------[ Internal ]----------


    private prepareRouteVisit(visit: PendingVisit): void {
        const page = usePage();
        const overlayId = this.focusedOverlayId();
        const overlay = overlayId ? this.overlayResolver(overlayId) : null;

        visit.headers[header.PAGE_COMPONENT] = page.component;
        visit.headers[header.OVERLAY_BASE_URL] = this.baseUrl.href;

        if (overlay && ! overlay.hasState('closing')) {
            visit.headers[header.INERTIA_OVERLAY] = 'true';
            visit.headers[header.OVERLAY_ID] = overlay.id;
            visit.headers[header.OVERLAY_URL] = overlay.url.href;

            visit.preserveScroll = true;
            visit.preserveState = true;

            if (this.isPageReload(visit)) {
                this.restoreOverlayUrl(visit, overlay);
            }
        }
    }

    private restoreOverlayUrl(visit: PendingVisit, overlay: ReadonlyOverlay): void {
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

    private resolveRootUrl(): URL {
        return this.baseUrl;
    }

}