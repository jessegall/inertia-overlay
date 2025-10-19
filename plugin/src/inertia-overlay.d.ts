import { ComputedRef } from "vue";

export interface OverlayEventListener<T> {
    listen: (listener: (payload: T) => void) => VoidFunction;
    remove: (listener: (payload: T) => void) => void;
}

export type OverlayEvent<T> = [
    listeners: OverlayEventListener<T>,
    trigger: (payload: T) => void
]

export interface OverlayOptions {
    id: string;
    typename: string;
    size: string;
    props: string[];
    variant: OverlayVariant;
}

export interface OverlayHandle {

    id: string;
    index: ComputedRef<number>;
    state: OverlayState;

    onStatusChange: OverlayEventListener<OverlayStatus>

    open: () => void;
    close: () => void;
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