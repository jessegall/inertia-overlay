import { router, usePage } from "@inertiajs/vue3";
import { EventDispatcher } from "./event.ts";
import { Page, PendingVisit } from "@inertiajs/core";
import { headers, OverlayPage } from "./Overlay.ts";
import { isOverlayPage } from "./helpers.ts";
import { OverlayStack } from "./OverlayStack.ts";
import { reactive, ref } from "vue";

export class OverlayRequest {

    // ----------[ Events ]----------

    public readonly onBeforeRouteVisit = new EventDispatcher<PendingVisit>();
    public readonly onSuccessfulRouteVisit = new EventDispatcher<Page>();

    // ----------[ Properties ]----------

    private readonly rootUrl = ref<string | null>(null)

    constructor(
        private readonly stack: OverlayStack
    ) {
        this.setupDispatchers();
        this.setupListeners();
    }

    // ----------[ Setup ]----------

    private setupDispatchers(): void {
        router.on('before', event => this.onBeforeRouteVisit.trigger(event.detail.visit));
        router.on('success', event => this.onSuccessfulRouteVisit.trigger(event.detail.page));
    }

    private setupListeners(): void {
        this.onBeforeRouteVisit.listen(visit => this.handleBeforeRouteVisit(visit));
    }

    // ----------[ Api ]----------

    public async fetch(overlayId: string): Promise<OverlayPage> {
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

    public hasRootUrl(): boolean {
        return this.rootUrl.value !== null;
    }

    public getRootUrl(): string | null {
        return this.rootUrl.value;
    }

    // ----------[ Internal ]----------

    public setRootUrl(url: string | null): void {
        this.rootUrl.value = url;
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const overlayId = visit.url.searchParams.get("overlay");

        if (overlayId) {
            const page = usePage();
            const overlay = reactive(this.stack.findById(overlayId));

            if (! this.hasRootUrl()) {
                this.setRootUrl(page.url);
            }

            visit.headers = {
                ...visit.headers,
                [headers.INERTIA]: 'true',
                [headers.INERTIA_PARTIAL_COMPONENT]: page.component,
                [headers.OVERLAY]: 'true',
                [headers.OVERLAY_ID]: overlay.id,
                [headers.OVERLAY_STATE]: overlay.state,
                [headers.OVERLAY_PREVIOUS_ID]: overlay.parentId,
                [headers.OVERLAY_ROOT_URL]: this.getRootUrl(),
            }
        }
    }

}