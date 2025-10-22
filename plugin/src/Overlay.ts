import { router, usePage } from "@inertiajs/vue3";
import { EventDispatcher } from "./event.ts";
import { ref } from "vue";
import { isOverlayPage } from "./helpers.ts";
import { Page, Visit } from "@inertiajs/core";

export type OverlayType = string;
export type OverlayVariant = 'modal' | 'drawer';
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '80%' | 'full';
export type OverlayArgs = Record<string, any>;
export type OverlayProps = Record<string, any>;
export type OverlayState = 'closed' | 'opening' | 'open' | 'closing';

export interface OverlayConfig {
    id: string;
    typename: string;
    variant: OverlayVariant;
    size: OverlaySize;
    props: string[];
}

export type OverlayPage = Page & { overlay: OverlayConfig };

export const headers = {

    OVERLAY: 'X-Inertia-Overlay',
    OVERLAY_INDEX: 'X-Inertia-Overlay-Index',
    OVERLAY_ROOT_URL: 'X-Inertia-Overlay-Root-Url',
    OVERLAY_PAGE_COMPONENT: 'X-Inertia-Overlay-Page-Component',

    OVERLAY_ID: 'X-Inertia-Overlay-Id',
    OVERLAY_STATE: 'X-Inertia-Overlay-State',
    OVERLAY_PREVIOUS_ID: 'X-Inertia-Overlay-Previous-Id',

    OVERLAY_OPENING: 'X-Inertia-Overlay-Opening',
    OVERLAY_CLOSING: 'X-Inertia-Overlay-Closing',
    OVERLAY_DIRTY: 'X-Inertia-Overlay-Dirty',

}


export class Overlay {

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventDispatcher<OverlayState>();
    public readonly onFocused = new EventDispatcher<void>();
    public readonly onBlurred = new EventDispatcher<void>();

    // ----------[ Properties ]----------

    public state = ref<OverlayState>('closed')
    public focused = ref<boolean>(false);
    public props = ref<OverlayProps | null>(null);
    public config = ref<OverlayConfig | null>(null);

    constructor(
        public readonly id: string,
        public readonly type: OverlayType,
        public readonly args: OverlayArgs,
    ) {
        router.on('before', event => this.onRouterBeforeVisit(event.detail.visit));
        router.on('success', event => this.onRouteSuccessVisit(event.detail.page));
    }

    // ----------[ Api ]----------

    public async open(): Promise<void> {
        if (! this.hasStatus('closed')) {
            return;
        }

        this.focus();

        this.setState('opening');

        await this.reload();

        this.setState('open');
    }

    public async close(): Promise<void> {
        if (! this.hasStatus('open')) {
            return;
        }

        this.setState('closing');

        await this.reload();

        this.setState('closed');
    }

    public focus(): void {
        this.focused.value = true;
        this.onFocused.trigger();
        console.log('focused');
    }

    public blur(): void {
        this.focused.value = false;
        this.onBlurred.trigger();
        console.log('blurred');
    }

    public hasStatus(...statuses: OverlayState[]): boolean {
        return statuses.includes(this.state.value);
    }

    public isFocused(): boolean {
        return this.focused.value;
    }

    public isBlurred(): boolean {
        return ! this.focused.value;
    }

    // ----------[ Internal ]----------

    private async reload(): Promise<void> {
        await new Promise<void>((resolve, error) => {
            router.reload({
                data: {
                    overlay: this.id,
                },
                onSuccess: () => {
                    resolve();
                },
                onError: () => {
                    error();
                },
            });
        })
    }

    private setState(state: OverlayState): void {
        this.state.value = state;
        this.onStatusChange.trigger(state);
    }

    // ----------[ Event Handlers ]----------


    private onRouterBeforeVisit(visit: Visit): void {
        const page = usePage();

        if (this.isFocused()) {
            visit.headers = {
                'X-Inertia': 'true',
                'X-Inertia-Partial-Component': page.component,
                [headers.OVERLAY]: 'true',
                [headers.OVERLAY_ID]: this.id,
                [headers.OVERLAY_STATE]: this.state.value,
                [headers.OVERLAY_ROOT_URL]: page.url,
                ...visit.headers,
            }
        }
    }

    private onRouteSuccessVisit(page: Page): void {
        if (isOverlayPage(page) && page.overlay.id === this.id) {
            this.config.value = page.overlay;
            this.props.value = page.props;
        }
    }

}