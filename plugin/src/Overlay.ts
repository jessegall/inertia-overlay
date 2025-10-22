import { EventDispatcher } from "./event.ts";
import { ref } from "vue";
import { isOverlayPage } from "./helpers.ts";
import { Page, PendingVisit } from "@inertiajs/core";
import { OverlayRequest } from "./OverlayRequest.ts";

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

    INERTIA: 'X-Inertia',
    INERTIA_PARTIAL_COMPONENT: 'X-Inertia-Partial-Component',

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


const count = ref<number>(0);

export class Overlay {

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventDispatcher<OverlayState>();
    public readonly onFocused = new EventDispatcher<void>();
    public readonly onBlurred = new EventDispatcher<void>();

    // ----------[ Properties ]----------

    public parentId = ref<string | null>(null);
    public index = ref<number>(null);
    public state = ref<OverlayState>('closed')
    public focused = ref<boolean>(false);
    public props = ref<OverlayProps | null>(null);
    public config = ref<OverlayConfig | null>(null);

    constructor(
        public readonly id: string,
        public readonly type: OverlayType,
        public readonly args: OverlayArgs,
        public readonly request: OverlayRequest,
    ) {
        this.index.value = count.value++;
        this.setupListeners();
    }

    // ----------[ Setup ]----------

    private setupListeners(): void {
        this.request.onBeforeRouteVisit.listen(visit => this.handleBeforeRouteVisit(visit));
        this.request.onSuccessfulRouteVisit.listen(page => this.handleSuccessfulRouteVisit(page));
    }

    // ----------[ Api ]----------

    public async open(): Promise<void> {
        if (! this.hasState('closed')) {
            return;
        }

        this.setState('opening');
        await this.request.fetch(this.id);
        this.setState('open');
    }

    public async close(): Promise<void> {
        if (! this.hasState('open')) {
            return;
        }

        this.setState('closing');

        if (this.isFocused()) {
            const parentId = this.getParentId();

            if (parentId) {
                await this.request.fetch(parentId);
            } else {
                console.log("Return to page");
            }
        }

        this.setState('closed');
    }

    public setParentId(parentId: string | null): void {
        this.parentId.value = parentId;
    }

    public getParentId(): string | null {
        return this.parentId.value
    }

    public getState(): OverlayState {
        return this.state.value;
    }

    public setState(state: OverlayState): void {
        this.state.value = state;
        this.onStatusChange.trigger(state);
    }

    public hasState(...states: OverlayState[]): boolean {
        return states.includes(this.state.value);
    }

    public focus(): void {
        if (this.isFocused()) {
            return;
        }

        this.focused.value = true;
        this.onFocused.trigger();
        console.log('focused', this.index.value);
    }

    public isFocused(): boolean {
        return this.focused.value;
    }

    public blur(): void {
        if (this.isBlurred()) {
            return;
        }

        this.focused.value = false;
        this.onBlurred.trigger();
        console.log('blurred', this.index.value);
    }

    public isBlurred(): boolean {
        return ! this.focused.value;
    }


    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        if (visit.url.searchParams.has('overlay', this.id)) {
            this.focus();
        } else {
            this.blur();
        }
    }

    private handleSuccessfulRouteVisit(page: Page): void {
        if (isOverlayPage(page) && page.overlay.id === this.id) {
            this.config.value = page.overlay;
            this.props.value = page.props;
        }
    }

}