import { inject } from "vue";
import { OverlayFactory } from "../OverlayFactory.ts";

export function useOverlayFactory(): OverlayFactory {
    return inject('overlay.factory');
}