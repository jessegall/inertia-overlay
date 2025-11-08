import { EventEmitter } from "./event.ts";
import { reactive, ref } from "vue";
import { Page } from "@inertiajs/core";

export type OverlayVariant = 'modal' | 'drawer';
export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '80%' | 'full';
export type OverlayProps = Record<string, any>;
export type OverlayStatus = 'created' | 'closed' | 'open';

export interface OverlayConfig {
    variant: OverlayVariant;
    size: OverlaySize;
    baseUrl: string;
}

export interface OverlayData {
    id: string;
    url: string;
    component: string;
    variant: OverlayVariant;
    size: OverlaySize;
    baseUrl: string;
    closeRequested: boolean;
    __commands: {
        close?: boolean;
    }
}

export type OverlayPage = Page & { overlay: OverlayData };

export interface OverlayOptions {
    id: string;
    url: URL;
    component: string;
    size: OverlaySize;
    variant: OverlayVariant;
    baseUrl?: URL;
}

export class Overlay {

    private readonly destroyed = ref(false);

    // ----------[ Events ]----------

    public readonly onOpen = new EventEmitter<void>();
    public readonly onClose = new EventEmitter<void>();
    public readonly onFocus = new EventEmitter<string>();
    public readonly onBlur = new EventEmitter<string>();

    // ----------[ State ]----------

    public url = ref<URL>();
    public index = ref(0);
    public parentId = ref<string | null>(null);
    public status = ref<OverlayStatus>('created');
    public focused = ref(false);
    public props = ref<OverlayProps>({});

    // ----------[ Constructor ]----------

    public constructor(
        public readonly options: OverlayOptions,
    ) {
        this.url.value = options.url;
    }

    // ----------[ Lifecycle ]----------

    public open() {
        this.setState('open');
    }

    public close() {
        this.setState('closed');
    }

    public destroy(): void {
        if (this.destroyed.value) return;
        console.log('destroying overlay', this.id, this.index.value);
        this.onOpen.clear();
        this.onClose.clear();
        this.onFocus.clear();
        this.onBlur.clear();
        this.destroyed.value = true;
    }

    // ----------[ Focus ]----------

    public focus(): void {
        if (this.focused.value) return;
        console.log('focusing overlay', this.index.value);
        this.focused.value = true;
        this.onFocus.emit(this.id);
    }

    public blur(): void {
        if (! this.focused.value) return;
        console.log('blurring overlay', this.index.value);
        this.focused.value = false;
        this.onBlur.emit(this.id);
    }

    public updateProps(props: OverlayProps): void {
        this.props.value = { ...this.props.value, ...props };
    }

    public handleCommands(commands: OverlayData['__commands']): void {
        if (commands.close) {
            this.close();
        }
    }

    // ----------[ State ]----------

    private setState(status: OverlayStatus): void {
        if (this.status.value === status) return;

        this.status.value = status;
        switch (status) {
            case 'open':
                this.onOpen.emit();
                break;
            case 'closed':
                this.onClose.emit();
                break;
        }
    }

    // ----------[ Helpers ]----------s

    public unscope(key: string): string {
        return key.startsWith(`${ this.id }.`) ? key.slice(this.id.length + 1) : key;
    }

    // ----------[ Accessors ]----------

    public get id(): string {
        return this.options.id;
    }

    public get component(): string {
        return this.options.component;
    }

    public get variant(): OverlayVariant {
        return this.options.variant;
    }

    public get size(): OverlaySize {
        return this.options.size;
    }

}