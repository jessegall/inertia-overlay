import { EventEmitter, EventSubscription } from "./event.ts";
import { ref } from "vue";
import { Page, PendingVisit } from "@inertiajs/core";
import { header, OverlayRouter } from "./OverlayRouter.ts";
import { router } from "@inertiajs/vue3";

export type OverlayVariant = 'modal' | 'drawer';
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '80%' | 'full';
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
    url: string;
    instance: string;
}

export type OverlayPage = Page & { overlay: OverlayConfig };
export type OverlayType = 'routed' | 'parameterized' | 'hidden';

export type OverlayOptions = {
    id: string;
    url: string;
    type: 'routed' | 'parameterized' | 'hidden';
    props: OverlayProps;
};

const activeTransitions = ref<number>(0);

export class Overlay {

    private subscription = new EventSubscription();
    private destroyed = ref(false);

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventEmitter<OverlayState>();
    public readonly onFocused = new EventEmitter<void>();
    public readonly onBlurred = new EventEmitter<void>();

    // ----------[ Properties ]----------

    public readonly parentId = ref<string | null>(null);
    public readonly index = ref<number>(-1);
    public readonly state = ref<OverlayState>('closed')
    public readonly focused = ref<boolean>(false);
    public readonly props = ref<OverlayProps | null>(null);
    public readonly config = ref<OverlayConfig | null>(null);

    constructor(
        private readonly router: OverlayRouter,
        public readonly options: OverlayOptions,
    ) {}

    // ----------[ Event Listeners ]----------

    private subscribe(): void {
        this.router.onBeforeRouteVisit.on({
            handler: visit => this.handleBeforeRouteVisit(visit),
            subscription: this.subscription,
        });

        this.router.onOverlayPageLoad.on({
            handler: page => this.handleOverlayPageLoad(page),
            subscription: this.subscription,
        });
    }

    private unsubscribe(): void {
        this.subscription.unsubscribe();
    }

    // ----------[ Api ]----------

    public async open(page?: OverlayPage): Promise<void> {
        this.assertNotDestroyed();
        if (! this.hasState('closed')) return;

        await this.transition(async () => {
            this.focus();
            this.subscribe();
            this.setState('opening');

            if (page) {
                this.handleOverlayPageLoad(page)
            } else {
                await this.router.open(this.id);
            }

            this.setState('open');
        });
    }

    public async close(): Promise<void> {
        this.assertNotDestroyed();
        if (! this.hasState('open')) return;

        await this.transition(async () => {
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
        })
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

    private loadDeferredProps(): void {
        const deferredProps = this.config.value?.deferredProps || [];
        if (deferredProps.length === 0) return;

        router.reload({
            only: deferredProps,
            headers: {
                [header.OVERLAY_DEFERRED]: 'true',
            }
        })
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

    private async transition(callback: () => Promise<void>): Promise<void> {
        while (activeTransitions.value > 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        activeTransitions.value++;

        try {
            await callback();
        } finally {
            activeTransitions.value--;
        }
    }

    // ----------[ Event Handlers ]----------

    private handleBeforeRouteVisit(visit: PendingVisit): void {
        const overlayId = visit.headers[header.OVERLAY_ID];
        const wasBlurred = this.isBlurred();
        if (overlayId === this.id) {
            this.focus();
        }

        if (this.isFocused()) {
            visit.headers[header.OVERLAY_ID] = this.id;
            visit.headers[header.OVERLAY_URL] = this.url;
            visit.headers[header.OVERLAY_REFOCUS] = this.hasState('open') && wasBlurred ? 'true' : 'false';
            visit.only = visit.only.map(item => this.scopedKey(item));
        }
    }

    private handleOverlayPageLoad(page: OverlayPage): void {
        if (page.overlay.id === this.id) {
            const config = page.overlay;
            const firstLoad = this.config.value === null;

            this.setConfig(config);
            this.updateProps(page);

            if (firstLoad) {
                this.loadDeferredProps()
            }

            if (config.closeRequested) {
                this.close();
            }

        } else {
            this.blur();
        }
    }

    // ----------[ Getters / Setters ]----------

    public scopedKey(key: string) {
        const prefix = `${ this.id }:`;

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

    private encodeArgs(): string {
        if (! this.initialProps || Object.keys(this.initialProps).length === 0) return null;
        const json = JSON.stringify(this.initialProps);
        return btoa(String.fromCharCode(...new TextEncoder().encode(json)));
    }

    // ----------[ Accessors ]----------

    public get id() {
        return this.options.id;
    }

    public get initialProps() {
        return this.options.props;
    }

    public get url(): string {
        return this.options.url;
    }

    public get type(): OverlayType {
        return this.options.type;
    }

    public get instanceId(): string {
        return this.config.value?.instance || null;
    }

}