import { EventEmitter, EventSubscription } from "./event.ts";
import { nextTick, reactive, ref } from "vue";
import { Page } from "@inertiajs/core";
import { OverlayRouter } from "./OverlayRouter.ts";
import { HttpMethod } from "./InertiaRouterAdapter.ts";

export type OverlayVariant = 'modal' | 'drawer';
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '80%' | 'full';
export type OverlayProps = Record<string, any>;
export type OverlayState = 'closed' | 'close-requested' | 'closing' | 'open' | 'open-requested' | 'opening';

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
    input: string[]
    baseUrl?: string
    method?: HttpMethod;
}

export type OverlayPage = Page & { overlay: OverlayResponse };

export type OverlayOptions = {
    id: string;
    url: URL;
    data?: Record<string, any>;
};

const activeTransitions = reactive<string[]>([]);

export class Overlay {

    private readonly subscription = new EventSubscription();
    private readonly destroyed = ref(false);

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventEmitter<OverlayState>();
    public readonly onFocused = new EventEmitter<string>();
    public readonly onBlurred = new EventEmitter<string>();

    // ----------[ Properties ]----------

    public readonly initialized = ref(false);
    public readonly parentId = ref<string | null>(null);
    public readonly index = ref<number>(-1);
    public readonly state = ref<OverlayState>('closed')
    public readonly focused = ref<boolean>(false);
    public readonly props = ref<OverlayProps | null>(null);
    public readonly component = ref<string | null>(null);
    public readonly config = ref<OverlayConfig | null>(null);

    constructor(
        private readonly router: OverlayRouter,
        private readonly options: OverlayOptions,
    ) {}

    // ----------[ Event Listeners ]----------

    private subscribe(): void {
        this.router.onOverlayPageLoad.listen({
            handler: page => {
                this.applyPage(page);
            },
            filter: page => page.overlay.id === this.id,
            priority: () => 10 + this.index.value,
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

    public async open(): Promise<void> {
        this.assertNotDestroyed();
        if (! this.hasState('closed')) return;

        this.setState('opening');

        await this.transition(async () => {
            this.subscribe();
            this.applyPage(await this.router.open(this.id));

            nextTick(() => {
                this.setState('open');
            })
        });
    }

    public async close(): Promise<void> {
        this.assertNotDestroyed();
        if (! this.hasState('open')) return;

        this.setState('closing');
        await this.transition(() => {
            nextTick(() => {
                this.setState('closed')
            })
        });
    }

    public focus(): void {
        if (this.isFocused()) return;
        console.log('focusing overlay', this.index.value);
        this.focused.value = true;
        this.onFocused.emit(this.id);
    }

    public blur(): void {
        if (this.isBlurred()) return;
        this.focused.value = false;
        this.onBlurred.emit(this.id);
    }

    public destroy(): void {
        if (this.isDestroyed()) return;
        this.unsubscribe();
        this.onStatusChange.clear();
        this.onFocused.clear();
        this.onBlurred.clear();
        this.destroyed.value = true;
    }

    private setState(state: OverlayState): void {
        if (this.state.value === state) return;
        this.state.value = state;
        this.onStatusChange.emit(state);
    }

    public updateUrl(url: URL): void {
        for (const [key, value] of url.searchParams.entries()) {
            this.options.url.searchParams.set(key, value);
        }
    }

    public updateProps(props: OverlayProps): void {
        this.props.value = {
            ...this.props.value,
            ...props,
        };
    }

    private async transition(callback: () => Promise<void> | void): Promise<void> {
        activeTransitions.push(this.id);

        while (activeTransitions[0] !== this.id) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        try {
            await callback();
        } finally {
            activeTransitions.splice(activeTransitions.indexOf(this.id), 1);
        }
    }

    // ----------[ Event Handlers ]----------

    public applyPage(page: OverlayPage): void {
        this.component.value = page.overlay.component;
        this.config.value = page.overlay.config;

        this.updateUrl(new URL(page.overlay.url));
        this.updateProps(page.props[this.id]);

        if (page.overlay.closeRequested) {
            this.close();
        }
    }

    // ----------[ Getters / Setters ]----------

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

    public get url() {
        return this.options.url;
    }
}