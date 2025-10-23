import { EventEmitter, EventSubscription } from "./event.ts";
import { Component, nextTick, ref, ShallowRef } from "vue";
import { ActiveVisit, Page, PendingVisit } from "@inertiajs/core";
import { OverlayRouter } from "./OverlayRouter.ts";
import { randomString } from "./helpers.ts";

export type OverlayType = string;
export type OverlayVariant = 'modal' | 'drawer';
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '80%' | 'full';
export type OverlayArgs = Record<string, any>;
export type OverlayProps = Record<string, any>;
export type OverlayState = 'closed' | 'opening' | 'open' | 'closing';

export type OverlayFlag = 'skip_hydration_on_refocus' | 'use_shared_props'

export interface OverlayConfig {
    id: string,
    component: string;
    variant: OverlayVariant;
    size: OverlaySize;
    flags: OverlayFlag[];
    props: string[];
    deferredProps: string[];
    actions: string[]
}

export type OverlayPage = Page & { overlay: OverlayConfig };

export interface OverlayOptions {
    id: string;
    component: ShallowRef<Component>;
}

const activeRequests = ref<number>(0);

export class Overlay {

    private subscription = new EventSubscription();

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventEmitter<OverlayState>();
    public readonly onFocused = new EventEmitter<void>();
    public readonly onBlurred = new EventEmitter<void>();

    // ----------[ Properties ]----------

    public readonly instanceId: string;

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
        this.instanceId = randomString();
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

        this.router.onFinishedRouteVisit.on({
            handler: visit => this.handleFinishedRouteVisit(visit),
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

        await this.waitForTransitions();

        this.subscribe();
        this.setState('opening');
        await this.router.open(this.id);
        this.setState('open');
    }

    public async close(): Promise<void> {
        if (! this.hasState('open')) return;

        await this.waitForTransitions();

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

    public hasFlag(flag: OverlayFlag): boolean {
        return this.config.value?.flags.includes(flag) ?? false;
    }

    public isInitialized(): boolean {
        return this.config.value !== null;
    }

    public scopedKey(key: string) {
        if (key.startsWith(`${ this.instanceId }:`)) {
            return key;
        }
        
        return `${ this.instanceId }:${ key }`;
    }

    public unscopeData(props: Record<string, any>): Record<string, any> {
        const unscoped: Record<string, any> = {};

        for (const key in props) {
            if (key.startsWith(`${ this.instanceId }:`)) {
                const unscopedKey = key.replace(`${ this.instanceId }:`, '');
                unscoped[unscopedKey] = props[key];
            }
        }

        return unscoped;

    }

    // ----------[ Internal ]----------

    private async waitForTransitions(): Promise<void> {
        while (activeRequests.value > 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

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

    private updateProps(page: OverlayPage): void {
        const props: OverlayProps = {};

        for (const key of page.overlay.props) {
            const scopedKey = this.scopedKey(key);
            const value = page.props[scopedKey];
            if (value === undefined || value === null) continue;
            props[key] = page.props[scopedKey];
        }

        this.props.value = {
            ...this.props.value,
            ...props,
        };
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const overlayId = visit.method === 'get'
            ? visit.url.searchParams.get("overlay")
            : new URL(window.location.href).searchParams.get("overlay");

        if (overlayId === this.id) {
            activeRequests.value += 1;
        }
    }

    private handleFinishedRouteVisit(visit: ActiveVisit): void {
        const overlayId = visit.method === 'get'
            ? visit.url.searchParams.get("overlay")
            : new URL(window.location.href).searchParams.get("overlay");

        if (overlayId === this.id) {
            nextTick(() => {
                activeRequests.value -= 1;
            })
        }
    }

    private handleSuccessfulRouteVisit(page: OverlayPage): void {
        if (page.overlay.id === this.id) {
            this.setConfig(page.overlay);
            this.updateProps(page);
            this.focus();
        } else {
            this.blur();
        }
    }

}