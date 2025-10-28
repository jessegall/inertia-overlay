import { router, usePage, } from "@inertiajs/vue3";
import { EventEmitter } from "./event.ts";
import { ActiveVisit, Page, PendingVisit, Visit } from "@inertiajs/core";
import { OverlayPage } from "./Overlay.ts";
import { deepToRaw, isOverlayPage } from "./helpers.ts";
import { reactive, ref } from "vue";
import { OverlayResolver } from "./OverlayPlugin.ts";

export const header = {

    // -----[ General ]-----

    INERTIA_OVERLAY: 'X-Inertia-Overlay',
    PAGE_COMPONENT: 'X-Inertia-Overlay-Page-Component',

    // -----[ Identification ]-----

    OVERLAY_ID: 'X-Inertia-Overlay-Id',
    OVERLAY_URL: 'X-Inertia-Overlay-Url',
    OVERLAY_ACTION: 'X-Inertia-Overlay-Action',

    // -----[ Lifecycle ]-----

    OVERLAY_OPENING: 'X-Inertia-Overlay-Opening',
    OVERLAY_REFOCUS: 'X-Inertia-Overlay-Refocus',

}

export class OverlayRouter {

    public readonly cache = reactive<Map<string, OverlayPage>>(new Map());

    // ----------[ Events ]----------

    public readonly onBeforeRouteVisit = new EventEmitter<PendingVisit>();
    public readonly onBeforeRouteUpdate = new EventEmitter<Page>();
    public readonly onSuccessfulRouteVisit = new EventEmitter<Page>();
    public readonly onFinishedRouteVisit = new EventEmitter<ActiveVisit>();
    public readonly onOverlayPageLoad = new EventEmitter<OverlayPage>();
    public readonly onNavigated = new EventEmitter<Page>();

    // ----------[ Properties ]----------

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
                this.preservePageProps(page);
            },
            filter: isOverlayPage,
            priority: -1
        });

        this.onSuccessfulRouteVisit.on({
            handler: page => {
                this.cache.set(page.overlay.id, page);
                this.onOverlayPageLoad.emit(page);
            },
            filter: isOverlayPage,
            priority: -1
        });
    }

    // ----------[ Api ]----------

    public async open(overlayId: string): Promise<OverlayPage> {
        const overlay = this.overlayResolver(overlayId);
        overlay.focus();

        if (this.cache.has(overlay.id)) {
            return this.cache.get(overlay.id);
        }

        return await new Promise((resolve, reject) => router.get(overlay.url,
            {
                ...overlay.initialProps,
                _props: Object.keys(overlay.initialProps),
            },
            {
                preserveUrl: true,
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

    public async action(overlayId: string, action: string, payload: Record<string, any> = {}): Promise<Page> {
        const overlay = this.overlayResolver(overlayId);

        return await new Promise((resolve, reject) => router.get(overlay.url,
            {
                payload,
            },
            {
                preserveUrl: true,
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
                onBefore(visit: Visit) {

                },
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

    // ----------[ Internal ]----------

    private prepareRouteVisit(visit: PendingVisit): void {
        const page = usePage();
        const overlayId = this.focusedId();
        const overlay = overlayId ? this.overlayResolver(overlayId) : null;

        visit.headers[header.PAGE_COMPONENT] = page.component;

        if (overlay && ! overlay.hasState('closing')) {
            visit.headers[header.INERTIA_OVERLAY] = 'true';
            visit.headers[header.OVERLAY_ID] = overlay.id;
            visit.headers[header.OVERLAY_URL] = overlay.url;

            visit.preserveScroll = true;
            visit.preserveState = true;
            visit.preserveUrl = true;
            visit.async = true;

            if (visit.method === 'get' && overlay.hasState('open')) {
                visit.url.pathname = new URL(overlay.url, visit.url.origin).pathname;
            }

            visit.url.searchParams.set('overlay', overlay.id);

            if (visit.only.length === 0) {
                visit.only = ['__inertia-overlay__'];
            }
        }
    }

    private preservePageProps(page: OverlayPage): void {
        if (! this.focusedId()) {

            page.url = this.rootUrl.value;

            // Preserve page props when receiving an overlay outside the "overlay context"
            // Frontend initiated overlays use partial requests so Inertia handles prop merging,
            // But overlays opened via backend will trigger a full page update.
            // In this case we need to manually merge the previous props into the new page.

            const previousPageProps = deepToRaw(usePage().props);
            for (const key in previousPageProps) {
                if (! page.props.hasOwnProperty(key)) {
                    page.props[key] = previousPageProps[key];
                }
            }

        }
    }

    // ----------[ Accessors ]----------

    public get url(): URL {
        return new URL(usePage().url, window.location.origin);
    }

    public set url(url: URL | string) {
        if (typeof url === 'string') {
            url = new URL(url, window.location.origin);
        }
        router.replace({ url: url.toString() });
    }

}