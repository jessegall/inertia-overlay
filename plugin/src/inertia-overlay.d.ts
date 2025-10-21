import { ComputedRef } from "vue";
import { Page } from "@inertiajs/core";

export type EventListener<T> = {
    callback: (payload: T) => void;
    priority: number | (() => number);
};

export type EventHandle<T> = {
    stop: VoidFunction;
}

export type Event<T> = {
    listen: (listener: ((payload: T) => void) | EventListener<T>) => EventHandle;
    remove: (listenerId: number) => void;
    trigger: (payload: T) => void,
    clear: () => void,
}

export type OverlayPage = Page & { overlay: OverlayConfig };

export interface OverlayConfig {
    id: string;
    typename: string;
    variant: OverlayVariant;
    size: string;
    props: string[];
}

export interface OverlayInstance {

    id: string;
    index: ComputedRef<number>;
    state: OverlayState;

    onStatusChange: Event<OverlayStatus>
    onFocus: Event<void>
    onBlur: Event<void>

    open: () => Promise<void>;
    close: () => Promise<void>;

    destroy: () => void;

    hasStatus: (...status: OverlayStatus[]) => boolean;

}

export interface OverlayState {
    dirty: boolean;
    focused: boolean;
    status: OverlayStatus;
    config: OverlayConfig;
    props: Record<string, any>;
}

export type OverlayVariant = 'modal' | 'drawer';

export type OverlayStatus = 'closed' | 'opening' | 'open' | 'closing';

export type OverlaySize =
    'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | '7xl'
    | '80%'
    | 'full';