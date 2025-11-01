import { EventEmitter, EventSubscription } from "./event.ts";
import { nextTick, reactive, ref } from "vue";
import { Page } from "@inertiajs/core";
import { OverlayRouter } from "./OverlayRouter.ts";
import { HttpMethod } from "./InertiaRouterAdapter.ts";

export type OverlayVariant = 'modal' | 'drawer';
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '80%' | 'full';
export type OverlayProps = Record<string, any>;
export type OverlayState = 'created' | 'initializing' | 'initialized' | 'closed' | 'closing' | 'open' | 'opening';

export interface OverlayConfig {
    variant: OverlayVariant;
    size: OverlaySize;
    displayUrl: boolean | string;
}

export interface OverlayResponse {
    id: string;
    url: string;
    component: string;
    config: OverlayConfig;
    baseUrl?: string;
    method?: HttpMethod;
    closeRequested: boolean;
}

export type OverlayPage = Page & { overlay: OverlayResponse };

export interface OverlayOptions {
    id: string;
    url: URL;
    method?: HttpMethod;
    data?: Record<string, any>;
}

const activeTransitions = reactive<string[]>([]);

export class Overlay {

    private readonly subscription = new EventSubscription();
    private readonly destroyed = ref(false);

    // ----------[ Events ]----------

    public readonly onStatusChange = new EventEmitter<OverlayState>();
    public readonly onFocused = new EventEmitter<string>();
    public readonly onBlurred = new EventEmitter<string>();

    // ----------[ State ]----------

    public url = ref<URL>(this.options.url);
    public baseUrl = ref<URL | null>(null);
    public parentId = ref<string | null>(null);
    public index = ref(0);
    public state = ref<OverlayState>('created');
    public focused = ref(false);
    public props = ref<OverlayProps>({});
    public component = ref<string | null>(null);
    public config = ref<OverlayConfig | null>(null);

    // ----------[ Constructor ]----------

    constructor(
        private readonly router: OverlayRouter,
        public readonly options: OverlayOptions,
    ) {
        this.url.value = this.options.url;
        this.baseUrl.value = null;
    }

    // ----------[ Lifecycle ]----------

    public async initialize(): Promise<void> {
        this.assertState('created');
        await this.transition(async () => {
            this.subscribe();
            this.setState('initializing');

            const page = await this.router.fetch(this.id);
            this.options.method = page.overlay.method;
            this.applyPage(page);

            await nextTick();
            this.setState('initialized');
        });
    }

    public async open(): Promise<void> {
        this.assertState('initialized', 'closed');
        await this.transition(async () => {
            this.setState('opening');
            await nextTick();
            this.setState('open');
        });
    }

    public async close(): Promise<void> {
        this.assertState('open');
        await this.transition(async () => {
            this.setState('closing');
            await nextTick();
            this.setState('closed');
        });
    }

    public destroy(): void {
        if (this.destroyed.value) return;
        this.unsubscribe();
        this.onStatusChange.clear();
        this.onFocused.clear();
        this.onBlurred.clear();
        this.destroyed.value = true;
    }

    // ----------[ Focus ]----------

    public focus(): void {
        if (this.focused.value) return;
        this.focused.value = true;
        this.onFocused.emit(this.id);
    }

    public blur(): void {
        if (! this.focused.value) return;
        this.focused.value = false;
        this.onBlurred.emit(this.id);
    }

    // ----------[ Updates ]----------

    public updateUrl(url: URL): void {
        const _url = this.url.value;
        url.searchParams.forEach((value, key) => _url.searchParams.set(key, value));
        this.url.value = _url;
    }

    public updateProps(props: OverlayProps): void {
        Object.assign(this.props.value, props);
    }

    public applyPage(page: OverlayPage): void {
        this.component.value = page.overlay.component;
        this.config.value = page.overlay.config;
        this.baseUrl.value = new URL(page.overlay.baseUrl);
        this.updateUrl(new URL(page.overlay.url));
        this.updateProps(page.props[this.id]);

        if (page.overlay.closeRequested) {
            this.close();
        }
    }

    // ----------[ Accessors ]----------

    public get id(): string {
        return this.options.id;
    }

    public get method(): HttpMethod {
        return this.options.method ?? 'get';
    }

    public hasState(...states: OverlayState[]): boolean {
        return states.includes(this.state.value);
    }

    // ----------[ Internal ]----------

    private subscribe(): void {
        this.router.onOverlayPageLoad.listen({
            handler: page => this.applyPage(page),
            filter: page => page.overlay.id === this.id,
            priority: () => 10 + this.index.value,
            subscription: this.subscription,
        });
    }

    private unsubscribe(): void {
        this.subscription.unsubscribe();
    }

    private setState(state: OverlayState): void {
        if (this.state.value === state) return;
        this.state.value = state;
        this.onStatusChange.emit(state);
    }

    private async transition(callback: () => Promise<void>): Promise<void> {

        // Queue this overlay's transition and wait for its turn to execute.
        // This ensures overlay state transitions happen sequentially, preventing
        // race conditions when multiple overlays change state simultaneously.

        if (activeTransitions.includes(this.id)) {
            throw new Error(`Overlay "${ this.id }" is already performing a state transition.`);
        }

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

    private assertState(...expected: OverlayState[]): void {
        if (! this.hasState(...expected)) {
            throw new Error(`Overlay "${ this.id }" in state "${ this.state.value }", expected: ${ expected.join(', ') }`);
        }
    }

}