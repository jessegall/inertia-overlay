import { EventEmitter, EventSubscription } from "./event.ts";
import { Component, ref, ShallowRef } from "vue";
import { Page, PendingVisit } from "@inertiajs/core";
import { clone } from "./helpers.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
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
    flags: {
        skipHydrationOnRefocus: boolean;
    }
}

export type OverlayPage = Page & { overlay: OverlayConfig };

export interface OverlayOptions {
    id: string;
    component: ShallowRef<Component>;
}

export class Overlay {

    private subscription = new EventSubscription();

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventEmitter<OverlayState>();
    public readonly onFocused = new EventEmitter<void>();
    public readonly onBlurred = new EventEmitter<void>();

    // ----------[ Properties ]----------

    public readonly id: string;
    public readonly component: ShallowRef<Component>

    public readonly parentId = ref<string | null>(null);
    public readonly index = ref<number>(-1);
    public readonly state = ref<OverlayState>('closed')
    public readonly focused = ref<boolean>(false);
    public readonly props = ref<OverlayProps | null>(null);
    public readonly config = ref<OverlayConfig | null>(null);

    constructor(
        private readonly router: OverlayRouter,
        { id, component }: OverlayOptions
    ) {
        this.id = id;
        this.component = component;
    }

    // ----------[ Event Listeners ]----------

    private subscribe(): void {
        this.router.onBeforeRouteVisit.on({
            handler: visit => this.handleBeforeRouteVisit(visit),
            priority: () => this.index.value,
            subscription: this.subscription,
        });

        this.router.onOverlayPageLoad.on({
            handler: page => this.handleSuccessfulRouteVisit(page),
            priority: () => this.index.value,
            subscription: this.subscription,
        });
    }

    private unsubscribe(): void {
        this.subscription.unsubscribe();
    }

    // ----------[ Api ]----------

    public async open(): Promise<void> {
        if (! this.hasState('closed')) return;

        this.subscribe();
        this.setState('opening');
        await this.router.open(this.id);
        this.setState('open');
    }

    public async close(): Promise<void> {
        if (! this.hasState('open')) return;

        this.setState('closing');

        if (this.isFocused()) {
            const start = Date.now();
            const parentId = this.parentId.value;

            if (parentId) {
                await this.router.open(parentId);
            } else {
                await this.router.navigateToRoot();
            }

            const elapsed = Date.now() - start;
            const minDuration = 300;
            if (elapsed < minDuration) {
                await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
            }
        }

        this.setState('closed');
        this.unsubscribe();
    }

    public setParentId(parentId: string | null): void {
        this.parentId.value = parentId;
    }

    public setState(state: OverlayState): void {
        this.state.value = state;
        this.onStatusChange.emit(state);
    }

    public hasState(...states: OverlayState[]): boolean {
        return states.includes(this.state.value);
    }

    public setIndex(index: number): void {
        this.index.value = index;
    }

    public isFocused(): boolean {
        return this.focused.value;
    }

    public isBlurred(): boolean {
        return ! this.focused.value;
    }

    public hasFlag(flag: keyof OverlayConfig['flags']): boolean {
        return this.config.value?.flags[flag] || false;
    }

    // ----------[ Internal ]----------

    private setConfig(config: OverlayConfig): void {
        this.config.value = config;
    }

    private focus(): void {
        if (this.isFocused()) return;
        this.focused.value = true;
        this.onFocused.emit();
    }

    private blur(): void {
        if (this.isBlurred()) return;
        this.focused.value = false;
        this.onBlurred.emit();
    }

    private updateProps(props: OverlayProps): void {
        const _props = this.props.value || {};

        for (const key of this.config.value.props) {
            const value = props[key];
            if (value === undefined || value === null) {
                continue;
            }
            _props[key] = value;
        }

        this.props.value = _props;
    }

    private restoreOverlayProps(props: OverlayProps): void {
        for (const key of this.config.value.props) {
            props[key] = clone(this.props[key])
        }
    }

    private clearOverlayProps(props: OverlayProps): void {
        for (const key of this.config.value.props) {
            delete props[key];
        }
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const overlayId = visit.url.searchParams.get('overlay');

        if (this.isFocused() && overlayId && overlayId !== this.id) {
            const page = usePage();
            this.clearOverlayProps(page.props);
        }
    }

    private handleSuccessfulRouteVisit(page: OverlayPage): void {
        if (page.overlay.id === this.id) {
            this.setConfig(page.overlay);

            if (this.hasState('open') && this.isBlurred() && this.hasFlag('skipHydrationOnRefocus')) {
                this.restoreOverlayProps(page.props);
            }
            
            this.updateProps(page.props);
            this.focus();
        } else {
            this.blur();
        }
    }

}