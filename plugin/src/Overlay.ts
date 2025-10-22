import { EventDispatcher } from "./event.ts";
import { Component, ref, ShallowRef } from "vue";
import { Page, PendingVisit } from "@inertiajs/core";
import { OverlayRequest } from "./OverlayRequest.ts";
import { usePage } from "@inertiajs/vue3";

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

export class Overlay {

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventDispatcher<OverlayState>();
    public readonly onFocused = new EventDispatcher<void>();
    public readonly onBlurred = new EventDispatcher<void>();

    // ----------[ Properties ]----------

    public parentId = ref<string | null>(null);
    public index = ref<number>(-1);
    public state = ref<OverlayState>('closed')
    public focused = ref<boolean>(false);
    public props = ref<OverlayProps | null>(null);
    public config = ref<OverlayConfig | null>(null);

    constructor(
        public readonly id: string,
        public readonly type: OverlayType,
        public readonly args: OverlayArgs,
        public readonly request: OverlayRequest,
        public readonly component: ShallowRef<Component>,
    ) {
        this.setupListeners();
    }

    // ----------[ Setup ]----------

    private setupListeners(): void {
        this.request.onBeforeRouteVisit.listen({
            callback: visit => this.handleBeforeRouteVisit(visit),
            priority: () => this.index.value,
        });

        this.request.onOverlayPageLoad.listen({
            callback: page => this.handleSuccessfulRouteVisit(page),
            priority: () => this.index.value,
        });
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
            const start = Date.now();
            const parentId = this.getParentId();

            if (parentId) {
                await this.request.fetch(parentId);
            } else {
                await this.request.fetchRoot();
            }

            const elapsed = Date.now() - start;
            const minDuration = 300;
            if (elapsed < minDuration) {
                await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
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

    public setState(state: OverlayState): void {
        this.state.value = state;
        this.onStatusChange.trigger(state);
    }

    public hasState(...states: OverlayState[]): boolean {
        return states.includes(this.state.value);
    }

    public setIndex(index: number): void {
        this.index.value = index;
    }

    public focus(): void {
        if (this.isFocused()) {
            return;
        }

        this.focused.value = true;
        this.onFocused.trigger();

        console.log("Overlay focused:", this.index.value);
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

        console.log("Overlay blurred:", this.index.value);
    }

    public isBlurred(): boolean {
        return ! this.focused.value;
    }

    // ----------[ Internal ]----------

    private setConfig(config: OverlayConfig): void {
        this.config.value = config;
    }

    private updateProps(props: OverlayProps): void {
        console.log("Update", this.index.value);
        const _props: OverlayProps = {};
        for (const key of this.config.value.props) {
            _props[key] = props[key];
        }
        this.props.value = _props;
    }

    private restorePageProps(): void {
        const page = usePage();
        for (const key of this.config.value.props) {
            page.props[key] = this.props.value[key];
        }
    }

    private clearPageProps(): void {
        const page = usePage();
        for (const key of this.config.value.props) {
            delete page.props[key];
        }
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {

    }

    private handleSuccessfulRouteVisit(page: OverlayPage): void {
        if (page.overlay.id === this.id) {
            this.setConfig(page.overlay);
            if (this.isBlurred() && this.hasState('open')) {
                this.restorePageProps();
            } else {
                this.updateProps(page.props);
            }
            this.focus();
        } else {
            this.blur();
        }
    }

}