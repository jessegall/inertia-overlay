import { router, usePage, } from "@inertiajs/vue3";
import { EventEmitter } from "./event.ts";
import { ActiveVisit, Page, PendingVisit } from "@inertiajs/core";
import { OverlayConfig, OverlayPage } from "./Overlay.ts";
import { isOverlayPage } from "./helpers.ts";
import { ref } from "vue";
import { OverlayResolver } from "./OverlayPlugin.ts";

export const header = {

    // -----[ General ]-----

    INERTIA_OVERLAY: 'X-Inertia-Overlay',
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
        private readonly peekId: () => string | null,
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

        return await new Promise((resolve, reject) => router.post(
            overlay.url,
            {
                _method: 'GET',
                props: overlay.initialProps,
            },
            {
                headers: {
                    [header.OVERLAY_ID]: overlay.id,
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
        const overlay = this.overlayResolver(overlayId);

        return await new Promise((resolve, reject) => router.post(overlay.url,
            {
                ...data,
                _method: 'GET',
            },
            {
                headers: {
                    [header.OVERLAY_ID]: overlay.id,
                    [header.OVERLAY_ACTION]: action,
                },
                onBefore(visit) {
                    visit.url.searchParams.set('overlay', overlay.id);
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

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const page = usePage();
        const overlayId = this.peekId();

        visit.headers[header.INERTIA_OVERLAY] = overlayId ? 'true' : null;
        visit.headers[header.PAGE_COMPONENT] = page.component;
        visit.headers[header.ROOT_URL] = this.rootUrl.value;

        if (overlayId) {
            const overlay = this.overlayResolver(overlayId);
            this.previousOverlayId.value = overlayId;

            if (this.isOverlayReloadRequest(visit)) {
                visit.method = 'post';
                visit.data['_method'] = 'GET';
            }

            visit.async = true;
            visit.preserveScroll = true;
            visit.preserveState = true;

            if (overlay.type === 'hidden' || overlay.type === 'parameterized') {
                visit.preserveUrl = true;
            }

            if (visit.only.length === 0) {
                visit.only = ['__overlay_partial_reload_trigger']
            }
        }
    }

    private handleSuccessfulRouteVisit(page: Page): void {
        if (isOverlayPage(page)) {
            this.overlayConfig.value = page.overlay;
            this.onOverlayPageLoad.emit(page);

            if (page.overlay.type === 'parameterized') {
                const url = this.currentUrl;
                url.searchParams.set('overlay', page.overlay.instance);
                router.replace({ url: url.toString() });
            }
        }
    }

    // ----------[ Helpers ]----------

    public isOverlayReloadRequest(visit: PendingVisit): boolean {
        return visit.headers[header.INERTIA_OVERLAY]
            && visit.method === 'get'
            && visit.only.length > 0
    }

    // ----------[ Accessors ]----------

    public get currentUrl() {
        return new URL(usePage().url, window.location.origin);
    }

}