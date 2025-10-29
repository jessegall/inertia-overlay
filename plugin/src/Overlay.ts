import { EventEmitter, EventSubscription } from "./event.ts";
import { Reactive, ref } from "vue";
import { Page } from "@inertiajs/core";
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
    input: string[]
    baseUrl?: string
}

export type OverlayPage = Page & { overlay: OverlayResponse };

export type OverlayOptions = {
    id: string;
    url: string;
    props: OverlayProps;
    input?: string[];
    baseUrl?: string;
    config?: Partial<OverlayConfig>;
};

const activeTransitions = ref<number>(0);

export class Overlay {

    public readonly url: Reactive<URL> = null;
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
        public readonly options: OverlayOptions,
    ) {
        this.url = new URL(options.url, window.location.origin);
    }

    // ----------[ Event Listeners ]----------

    private subscribe(): void {
        this.router.onOverlayPageLoad.on({
            handler: page => {
                this.applyPage(page);
            },
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

    public async open(): Promise<void> {
        this.assertNotDestroyed();
        if (! this.hasState('closed')) return;

        this.subscribe();

        await this.transition(async () => {
            this.focus();
            this.setState('opening');
            const page = await this.router.open(this.id);
            this.applyPage(page);
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
        this.setState('closed');
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
            this.url.searchParams.set(key, value);
        }
    }

    public updateProps(props: OverlayProps): void {
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

    // ----------[ Helpers ]----------

    public scopedKey(key: string) {
        const prefix = `${ this.id }:`;

        if (key.startsWith(prefix)) {
            return key;
        }

        return prefix + key;
    }

    public unscopedKey(key: string) {
        const prefix = `${ this.id }:`;

        if (key.startsWith(prefix)) {
            return key.substring(prefix.length);
        }

        return key;
    }

    private normalizeData(data: Record<string, any>, keys?: string[]): OverlayProps {
        keys ??= Object.keys(data);
        keys = keys.map((key) => this.unscopedKey(key));

        return keys.reduce<OverlayProps>((resolved, key) => {
            const value = data[this.scopedKey(key)] ?? data[key];
            if (value != null) resolved[key] = value;
            return resolved;
        }, {});
    }

    // ----------[ Event Handlers ]----------

    public applyPage(page: OverlayPage): void {
        this.initialized.value = true;
        this.component.value = page.overlay.component;
        this.config.value = page.overlay.config;

        this.updateUrl(new URL(page.overlay.url));
        this.updateProps(this.normalizeData(page.props, page.overlay.props));

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

    public get parameters() {
        if (! this.options.input) {
            return this.options.props;
        }

        return this.normalizeData(this.options.props, this.options.input);
    }

}