import { EventEmitter, EventSubscription } from "./event.ts";
import { Component, ref, ShallowRef } from "vue";
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
    closeRequested: boolean;
}

export type OverlayPage = Page & { overlay: OverlayConfig };

export interface OverlayOptions {
    id: string;
    component: ShallowRef<Component>;
}

const activeRequests = ref<number>(0);

export class Overlay {

    private subscription = new EventSubscription();
    private destroyed = ref(false);

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventEmitter<OverlayState>();
    public readonly onFocused = new EventEmitter<void>();
    public readonly onBlurred = new EventEmitter<void>();

    // ----------[ Properties ]----------

    public readonly id: string;
    public readonly instanceId: string;
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
        this.instanceId = randomString();
        this.component = component;
    }

    // ----------[ Event Listeners ]----------

    private subscribe(): void {
        this.router.onBeforeRouteVisit.on({
            handler: visit => this.handleBeforeRouteVisit(visit),
            subscription: this.subscription,
        });

        this.router.onFinishedRouteVisit.on({
            handler: visit => this.handleFinishedRouteVisit(visit),
            subscription: this.subscription,
        });

        this.router.onOverlayPageLoad.on({
            handler: page => this.handleOverlayPageLoad(page),
            priority: () => this.index.value,
            subscription: this.subscription,
        });
    }

    private unsubscribe(): void {
        this.subscription.unsubscribe();
    }

    // ----------[ Api ]----------

    public async open(): Promise<void> {
        this.assertNotDestroyed();

        if (! this.hasState('closed')) return;

        await this.waitForActiveRequests();

        this.subscribe();
        this.setState('opening');

        await this.router.open(this.id);

        this.setState('open');
    }

    public async close(): Promise<void> {
        this.assertNotDestroyed();

        if (! this.hasState('open')) return;

        await this.waitForActiveRequests();

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
    }

    public destroy(): void {
        if (this.isDestroyed()) return;

        this.setState('closed');
        this.setParentId(null);
        this.setIndex(-1);
        this.unsubscribe();
        this.onStatusChange.clear();
        this.onFocused.clear();
        this.onBlurred.clear();
        this.destroyed.value = true;

        console.log(`Overlay instance "${ this.id }" destroyed.`);
    }

    // ----------[ Internal ]----------

    private assertNotDestroyed(): void {
        if (this.isDestroyed()) {
            throw new Error(`Cannot perform operation on destroyed overlay instance "${ this.id }".`);
        }
    }

    public setState(state: OverlayState): void {
        if (this.state.value === state) return;
        this.state.value = state;
        this.onStatusChange.emit(state);
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

    private async waitForActiveRequests(): Promise<void> {
        while (activeRequests.value > 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const overlayId = this.router.resolveOverlayId(visit);

        if (overlayId === this.id) {
            activeRequests.value += 1;
        }
    }

    private handleFinishedRouteVisit(visit: ActiveVisit): void {
        const overlayId = this.router.resolveOverlayId(visit);

        if (overlayId === this.id) {
            activeRequests.value -= 1;
        }
    }

    private handleOverlayPageLoad(page: OverlayPage): void {
        if (page.overlay.id === this.id) {
            const config = page.overlay;

            this.setConfig(config);
            this.updateProps(page);

            if (config.closeRequested) {
                this.close();
            } else {
                this.focus();
            }
        } else {
            this.blur();
        }
    }

    // ----------[ Getters / Setters ]----------

    public scopedKey(key: string) {
        const prefix = `${ this.instanceId }:`;

        if (key.startsWith(prefix)) {
            return key;
        }

        return prefix + key;
    }

    public setParentId(parentId: string | null): void {
        this.parentId.value = parentId;
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

    public isDestroyed(): boolean {
        return this.destroyed.value;
    }

}