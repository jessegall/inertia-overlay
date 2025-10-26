import { router, usePage, } from "@inertiajs/vue3";
import { EventEmitter } from "./event.ts";
import { ActiveVisit, Page, PendingVisit } from "@inertiajs/core";
import { OverlayConfig, OverlayPage } from "./Overlay.ts";
import { isOverlayPage } from "./helpers.ts";
import { ref } from "vue";
import { OverlayResolver } from "./OverlayPlugin.ts";

export const header = {

    // -----[ General ]-----

    PAGE_COMPONENT: 'X-Inertia-Overlay-Page-Component',
    ROOT_URL: 'X-Inertia-Overlay-Root-Url',

    // -----[ Identification ]-----

    OVERLAY_ID: 'X-Inertia-Overlay-Id',
    OVERLAY_URL: 'X-Inertia-Overlay-Url',
    OVERLAY_ACTION: 'X-Inertia-Overlay-Action',

    // -----[ Lifecycle ]-----

    OVERLAY_OPEN: 'X-Inertia-Overlay-Open',
    OVERLAY_REFOCUS: 'X-Inertia-Overlay-Refocus',
    OVERLAY_DEFERRED: 'X-Inertia-Overlay-Deferred',

}

export class OverlayRouter {

    public readonly overlayConfig = ref<OverlayConfig>(null);

    // ----------[ Events ]----------

    public readonly onBeforeRouteVisit = new EventEmitter<PendingVisit>();
    public readonly onSuccessfulRouteVisit = new EventEmitter<Page>();
    public readonly onFinishedRouteVisit = new EventEmitter<ActiveVisit>();
    public readonly onOverlayPageLoad = new EventEmitter<OverlayPage>();
    public readonly onNavigated = new EventEmitter<Page>();

    // ----------[ Properties ]----------

    private readonly previousOverlayId = ref<string | null>(null);
    private readonly rootUrl = ref<string | null>(null)

    constructor(
        private readonly overlayResolver: OverlayResolver,
    ) {
        this.setupEvents();
        this.setupListeners();
    }

    // ----------[ Setup ]----------

    private setupEvents(): void {
        router.on('before', event => this.onBeforeRouteVisit.emit(event.detail.visit));
        router.on('success', event => this.onSuccessfulRouteVisit.emit(event.detail.page));
        router.on('finish', event => this.onFinishedRouteVisit.emit(event.detail.visit));
        router.on('navigate', event => this.onNavigated.emit(event.detail.page));
    }

    private setupListeners(): void {
        this.onBeforeRouteVisit.on({
            handler: visit => this.handleBeforeRouteVisit(visit),
            priority: -1
        });

        this.onSuccessfulRouteVisit.on(page => this.handleSuccessfulRouteVisit(page));
    }

    // ----------[ Api ]----------

    public async open(overlayId: string): Promise<OverlayPage> {
        const overlay = this.overlayResolver(overlayId);

        return await new Promise((resolve, reject) => router.get(overlay.url,
            {
                ...overlay.data,
                overlay: overlayId,
            },
            {
                headers: {
                    [header.OVERLAY_OPEN]: 'true',
                },
                onSuccess(page) {
                    if (isOverlayPage(page)) {
                        resolve(page);
                    } else {
                        reject(new Error('Invalid overlay page response.'));
                    }
                },
                onError(error) {
                    reject(error);
                },
            }
        ));
    }

    public async action(overlayId: string, action: string, data: Record<string, any> = {}): Promise<Page> {
        return await new Promise((resolve, reject) => router.post(window.location.href,
            {
                ...data,
                overlay: overlayId,
                _method: 'GET',
            },
            {
                headers: {
                    [header.OVERLAY_ACTION]: action,
                },
                onSuccess(page) {
                    resolve(page);
                },
                onError(error) {
                    reject(error);
                }
            }
        ));
    }

    public async navigateToRoot(): Promise<Page> {
        if (! this.rootUrl.value) {
            console.error('No root URL stored for overlay request.');
            return;
        }

        return await new Promise(resolve => router.visit(this.rootUrl.value,
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess(page) {
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

    public resolveOverlayIdFromVisit(visit: ActiveVisit | PendingVisit) {
        return visit.url.searchParams.get("overlay") ?? visit.headers[header.OVERLAY_ID]
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const overlayId = this.resolveOverlayIdFromVisit(visit);
        const page = usePage();

        visit.headers[header.PAGE_COMPONENT] = page.component;

        if (! overlayId) return;

        const overlay = this.overlayResolver(overlayId);
        visit.url.searchParams.set("overlay", overlayId);
        visit.headers[header.OVERLAY_ID] = overlayId;

        visit.async = true;
        visit.preserveScroll = true;
        visit.preserveState = true;

        if (this.previousOverlayId.value !== overlayId && overlay.isBlurred() && overlay.hasState('open')) {
            visit.headers[header.OVERLAY_REFOCUS] = 'true';
        }

        this.previousOverlayId.value = overlayId;

        visit.headers[header.ROOT_URL] = this.rootUrl.value;

        if (visit.only.length === 0) {
            visit.only = ['__overlay_partial_reload_trigger']
        }
    }

    private handleSuccessfulRouteVisit(page: Page): void {
        if (isOverlayPage(page)) {
            this.overlayConfig.value = page.overlay;
            this.onOverlayPageLoad.emit(page);
        }
    }

    // ----------[ Accessors ]----------

    public get currentUrl() {
        return new URL(usePage().url, window.location.origin);
    }

}