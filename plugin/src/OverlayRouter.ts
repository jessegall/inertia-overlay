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

    OVERLAY_OPENING: 'X-Inertia-Overlay-Opening',
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
        private readonly focusedId: () => string | null,
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
        overlay.focus();

        return await new Promise((resolve, reject) => router.post(overlay.url,
            {
                _props: overlay.initialProps,
            },
            {
                headers: {
                    [header.INERTIA_OVERLAY]: 'true',
                    [header.OVERLAY_ID]: overlay.id,
                    [header.OVERLAY_OPENING]: overlay.hasState('opening') ? 'true' : 'false',
                    [header.OVERLAY_REFOCUS]: overlay.hasState('open') ? 'true' : 'false',
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
                _props: overlay.initialProps,
            },
            {
                headers: {
                    [header.INERTIA_OVERLAY]: 'true',
                    [header.OVERLAY_ID]: overlay.id,
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

        const rootUrl = new URL(this.rootUrl.value);

        return await new Promise(resolve => router.visit(rootUrl.href,
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    this.url = rootUrl;
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
        const overlayId = this.focusedId();

        visit.headers[header.PAGE_COMPONENT] = page.component;
        visit.headers[header.ROOT_URL] = this.rootUrl.value;

        if (overlayId) {
            const overlay = this.overlayResolver(overlayId);

            visit.headers[header.INERTIA_OVERLAY] = 'true';

            if (! visit.headers[header.OVERLAY_ID]) {
                visit.headers[header.OVERLAY_ID] = overlay.id;
            }

            visit.headers[header.OVERLAY_URL] = overlay.url;

            if (this.previousOverlayId.value !== overlay.id && overlay.hasState('open')) {
                visit.headers[header.OVERLAY_REFOCUS] = 'true';
            }

            if (this.isOverlayReloadRequest(visit)) {
                visit.url.pathname = overlay.url;
            }

            visit.async = true;
            visit.preserveScroll = true;
            visit.preserveState = true;

            if (overlay.type === 'hidden') {
                visit.preserveUrl = true;

                if (! visit.data['_props']) {
                    visit.data['_props'] = overlay.initialProps;
                }
            }

            if (visit.only.length === 0) {
                visit.only = ['__inertia-overlay__']
            }

            this.previousOverlayId.value = overlayId;
        }
    }

    private handleSuccessfulRouteVisit(page: Page): void {
        if (isOverlayPage(page)) {
            this.overlayConfig.value = page.overlay;
            this.onOverlayPageLoad.emit(page);
        }
    }

    // ----------[ Helpers ]----------

    public isOverlayReloadRequest(visit: PendingVisit): boolean {
        return visit.headers[header.INERTIA_OVERLAY]
            && visit.method === 'get'
            && visit.only.length > 0
    }

    public setSearchParam(key: string, value: string): void {
        const url = this.url;
        url.searchParams.set(key, value);
        this.url = url;
    }

    // ----------[ Accessors ]----------

    public get url() {
        return new URL(usePage().url, window.location.origin);
    }

    public set url(url: URL) {
        router.replace({ url: url.toString() });
    }

}