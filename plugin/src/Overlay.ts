import { EventEmitter, EventSubscription } from "./event.ts";
import { ref } from "vue";
import { Page, PendingVisit } from "@inertiajs/core";
import { OverlayRouter } from "./OverlayRouter.ts";

export type OverlayVariant = 'modal' | 'drawer';
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '80%' | 'full';
export type OverlayProps = Record<string, any>;
export type OverlayState = 'closed' | 'opening' | 'open' | 'closing';

export type OverlayFlag = 'skip_hydration_on_refocus' | 'use_shared_props'

export interface OverlayConfig {
    variant: OverlayVariant;
    size: OverlaySize;
    displayUrl: boolean | string;
}

export interface OverlayResponse {
    id: string,
    url: string;
    component: string;
    props: string[];
    config: OverlayConfig;
    closeRequested: boolean;
}

export type OverlayPage = Page & { overlay: OverlayResponse };

export type OverlayOptions = {
    id: string;
    url: string;
    props: OverlayProps;
    config?: Partial<OverlayConfig>;
};

const activeTransitions = ref<number>(0);

export class Overlay {

    private subscription = new EventSubscription();
    private destroyed = ref(false);

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventEmitter<OverlayState>();
    public readonly onFocused = new EventEmitter<string>();
    public readonly onBlurred = new EventEmitter<string>();

    // ----------[ Properties ]----------

    public readonly parentId = ref<string | null>(null);
    public readonly index = ref<number>(-1);
    public readonly state = ref<OverlayState>('closed')
    public readonly focused = ref<boolean>(false);
    public readonly props = ref<OverlayProps | null>(null);
    public readonly component = ref<string | null>(null);
    public readonly config = ref<OverlayConfig | null>(null);

    constructor(
        private readonly router: OverlayRouter,
        public readonly options: OverlayOptions,
    ) {}

    // ----------[ Event Listeners ]----------

    private subscribe(): void {
        this.router.onBeforeRouteVisit.on({
            handler: visit => this.handleBeforeRouteVisit(visit),
            priority: () => this.index.value,
            subscription: this.subscription,
        });

        this.router.onOverlayPageLoad.on({
            handler: page => this.handlePageLoad(page),
            filter: page => page.overlay.id === this.id,
            subscription: this.subscription,
        });
    }

    private unsubscribe(): void {
        this.subscription.unsubscribe();
    }

    // ----------[ State Api ]----------

    private assertNotDestroyed(): void {
        if (this.isDestroyed()) {
            throw new Error(`Cannot perform operation on destroyed overlay instance "${ this.id }".`);
        }
    }

    private isInitialized(): boolean {
        return this.config.value !== null;
    }

    public async open(page?: OverlayPage): Promise<void> {
        this.assertNotDestroyed();
        if (! this.hasState('closed')) return;

        await this.transition(async () => {
            this.subscribe();
            this.setState('opening');

            if (page) {
                this.handlePageLoad(page)
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

    public focus(): void {
        if (this.isFocused()) return;
        console.log(`Overlay instance "${ this.id }" focused.`);
        this.focused.value = true;
        this.onFocused.emit(this.id);
    }

    public blur(): void {
        if (this.isBlurred()) return;
        console.log(`Overlay instance "${ this.id }" blurred.`);
        this.focused.value = false;
        this.onBlurred.emit(this.id);
    }

    public destroy(): void {
        if (this.isDestroyed()) return;
        console.log("Destroying overlay instance:", this.id);
        this.setState('closed');
        this.unsubscribe();
        this.onStatusChange.clear();
        this.onFocused.clear();
        this.onBlurred.clear();
        this.destroyed.value = true;
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

    // ----------[ Internal ]----------

    private setState(state: OverlayState): void {
        if (this.state.value === state) return;
        this.state.value = state;
        this.onStatusChange.emit(state);
    }

    private setComponent(component: string): void {
        this.component.value = component;
    }

    private setConfig(config: OverlayConfig): void {
        this.config.value = {
            ...config,
            ...this.options.config,
        }
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
        if (this.isFocused()) {
            visit.only = visit.only.map(item => this.scopedKey(item));
        }
    }

    private handlePageLoad(page: OverlayPage): void {
        this.setComponent(page.overlay.component);
        this.setConfig(page.overlay.config);
        this.updateProps(page);

        if (page.overlay.closeRequested) {
            this.close();
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

}