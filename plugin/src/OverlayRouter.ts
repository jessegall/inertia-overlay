import { router, usePage, } from "@inertiajs/vue3";
import { EventEmitter } from "./event.ts";
import { ActiveVisit, Page, PendingVisit } from "@inertiajs/core";
import { OverlayConfig, OverlayPage } from "./Overlay.ts";
import { isOverlayPage } from "./helpers.ts";
import { ref } from "vue";
import { OverlayResolver } from "./OverlayPlugin.ts";

export const header = {
    OVERLAY: 'X-Inertia-Overlay',
    OVERLAY_ROOT_URL: 'X-Inertia-Overlay-Root-Url',
    PAGE_COMPONENT: 'X-Inertia-Overlay-Page-Component',
    OVERLAY_ID: 'X-Inertia-Overlay-Id',
    OVERLAY_PARENT_ID: 'X-Inertia-Overlay-Parent-Id',
    OVERLAY_URL: 'X-Inertia-Overlay-Url',
    OVERLAY_INDEX: 'X-Inertia-Overlay-Index',
    OVERLAY_STATE: 'X-Inertia-Overlay-State',
    OVERLAY_FOCUSED: 'X-Inertia-Overlay-Focused',
    OVERLAY_ACTION: 'X-Inertia-Overlay-Action',
    OVERLAY_REQUEST_COUNTER: 'X-Inertia-Overlay-Request-Counter',
    OVERLAY_REFOCUS: 'X-Inertia-Overlay-Refocus',
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
    private readonly counter = ref<number>(0);

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
        console.log(this.overlayConfig.value);
        if (this.overlayConfig.value?.id === overlayId) {
            console.log("Reusing existing overlay config for overlay ID:", overlayId);
            const page = usePage();
            page['overlay'] = this.overlayConfig.value;
            return page as OverlayPage;
        }

        const overlay = this.overlayResolver(overlayId);

        return await new Promise((resolve, reject) => router.get(overlay.url,
            {
                ...overlay.data,
                overlay: overlayId,
            },
            {
                async: true,
                preserveState: true,
                preserveScroll: true,
                headers: {
                    [header.OVERLAY_ID]: overlayId,
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
                async: true,
                headers: {
                    [header.OVERLAY_ID]: overlayId,
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
        return visit.url.searchParams.get("overlay")
            ?? visit.data['overlay']
            ?? visit.headers[header.OVERLAY_ID]
    }

    private updatePageUrl(page: OverlayPage): void {
        const url = new URL(usePage().url, window.location.origin);
        const overlayId = page.overlay.id;

        if (overlayId) {
            url.searchParams.set('overlay', overlayId);
        } else {
            url.searchParams.delete('overlay');
        }

        router.replace({
            url: url.toString(),
        })
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const page = usePage();
        const overlayId = this.resolveOverlayIdFromVisit(visit) ?? visit.headers[header.OVERLAY_ID];

        visit.headers[header.PAGE_COMPONENT] = page.component;

        if (! overlayId) {
            return;
        }

        const overlay = this.overlayResolver(overlayId);

        if (this.previousOverlayId.value !== overlayId) {
            this.counter.value = 0;
        }

        this.previousOverlayId.value = overlayId;
        this.counter.value += 1;

        visit.preserveScroll = true;
        visit.preserveState = true;

        visit.headers = {
            ...visit.headers,
            [header.OVERLAY_ROOT_URL]: this.rootUrl.value,
            [header.OVERLAY_REQUEST_COUNTER]: this.counter.value.toString(),
            [header.OVERLAY_REFOCUS]: overlay.hasState('open') && this.counter.value === 1 ? 'true' : 'false',
        }

        if (visit.only.length === 0) {
            visit.only = ['__overlay_partial_reload_trigger']
        }
    }

    private handleSuccessfulRouteVisit(page: Page): void {
        if (isOverlayPage(page)) {
            this.updatePageUrl(page);
            this.overlayConfig.value = page.overlay;
            this.onOverlayPageLoad.emit(page);
        }
    }

    // ----------[ Accessors ]----------

    public get currentUrl() {
        return new URL(usePage().url, window.location.origin);
    }

}