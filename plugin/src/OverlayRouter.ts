import { router, usePage, } from "@inertiajs/vue3";
import { EventEmitter } from "./event.ts";
import { ActiveVisit, Page, PendingVisit } from "@inertiajs/core";
import { OverlayPage, OverlayResponse } from "./Overlay.ts";
import { clone, isOverlayPage } from "./helpers.ts";
import { ref } from "vue";
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

    public readonly overlayConfig = ref<OverlayResponse>(null);

    // ----------[ Events ]----------

    public readonly onBeforeRouteVisit = new EventEmitter<PendingVisit>();
    public readonly onBeforeRouteUpdate = new EventEmitter<Page>();
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
        router.on('beforeUpdate', event => this.onBeforeRouteUpdate.emit(event.detail.page));
        router.on('success', event => this.onSuccessfulRouteVisit.emit(event.detail.page));
        router.on('finish', event => this.onFinishedRouteVisit.emit(event.detail.visit));
        router.on('navigate', event => this.onNavigated.emit(event.detail.page));
    }

    private setupListeners(): void {
        this.onBeforeRouteVisit.on({
            handler: visit => this.handleBeforeRouteVisit(visit),
            priority: -1
        });

        this.onBeforeRouteUpdate.on({
            handler: page => this.handleBeforeRouteUpdate(page as OverlayPage),
            filter: page => isOverlayPage(page),
            priority: -1
        });

        this.onSuccessfulRouteVisit.on({
            handler: page => this.handleSuccessfulRouteVisit(page as OverlayPage),
            filter: page => isOverlayPage(page),
            priority: -1
        });
    }

    // ----------[ Api ]----------

    public async open(overlayId: string): Promise<OverlayPage> {
        const overlay = this.overlayResolver(overlayId);
        overlay.focus();

        return await new Promise((resolve, reject) => router.post(overlay.url,
            {
                _method: 'GET',
                _props: overlay.initialProps,
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

    public async action(overlayId: string, action: string, data: Record<string, any> = {}): Promise<Page> {
        const overlay = this.overlayResolver(overlayId);

        return await new Promise((resolve, reject) => router.post(overlay.url,
            {
                ...data,
                _props: overlay.initialProps,
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

            const displayUrl = overlay.config?.displayUrl ?? overlay.options.config?.displayUrl;

            if (displayUrl === false) {
                visit.preserveUrl = true;
            }

            if (visit.only.length === 0) {
                visit.only = ['__inertia-overlay__']
            }

            this.previousOverlayId.value = overlayId;
        }
    }

    private handleBeforeRouteUpdate(page: OverlayPage): void {
        if (! this.focusedId()) {

            // Preserve page props when receiving an overlay outside the "overlay context"
            // Frontend initiated overlays use partial requests so Inertia handles prop merging,
            // But overlays opened via backend will trigger a full page update.
            // In this case we need to manually merge the previous props into the new page.

            const previousPageProps = clone(usePage().props);

            for (const key in previousPageProps) {
                if (! page.props.hasOwnProperty(key)) {
                    page.props[key] = previousPageProps[key];
                }
            }
        }
    }

    private handleSuccessfulRouteVisit(page: OverlayPage): void {
        this.overlayConfig.value = page.overlay;
        this.onOverlayPageLoad.emit(page);

        if (typeof page.overlay.config.displayUrl === 'string') {
            // this.url = page.overlay.config.displayUrl;
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