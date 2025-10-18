import { ComputedRef } from "vue";
import { OverlayEventListeners } from "@/OverlaysV2/Composables/use-overlay-event";

export interface OverlayOptions {
    id: string;
    type: string;
    size: string;
    props: string[];
    variant: OverlayVariant;
}

export interface OverlayHandle {

    id: string;
    index: ComputedRef<number>;
    state: OverlayState;

    onStatusChange: OverlayEventListeners<OverlayStatus>

    open: () => void;
    close: () => void;
    hasStatus: (...status: OverlayStatus[]) => boolean;

    get previousUrl(): string | null;

    get options(): OverlayOptions;

    get props(): Record<string, any>;
}

export interface OverlayState {
    status: OverlayStatus;
}

export type OverlayVariant = 'modal' | 'drawer';
export type OverlayStatus = 'closed' | 'opening' | 'open' | 'closing';