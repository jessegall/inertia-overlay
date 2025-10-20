import { ComputedRef } from "vue";

export type EventListener<T> = (payload: T) => void;

export type Event<T> = {
    listen: (listener: EventListener<T>) => VoidFunction;
    remove: (listener: EventListener<T>) => void;
    trigger: (payload: T) => void,
    clear: () => void,
}

export interface OverlayOptions {
    id: string;
    typename: string;
    size: string;
    props: string[];
    variant: OverlayVariant;
}

export interface OverlayInstance {

    id: string;
    index: ComputedRef<number>;
    state: OverlayState;

    onStatusChange: Event<OverlayStatus>
    onFocus: Event<void>
    onBlur: Event<void>

    open: () => void;
    close: () => void;
    destroy: () => void;

    hasStatus: (...status: OverlayStatus[]) => boolean;

    get options(): OverlayOptions;

    get props(): Record<string, any>;

}

export interface OverlayState {
    status: OverlayStatus;
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