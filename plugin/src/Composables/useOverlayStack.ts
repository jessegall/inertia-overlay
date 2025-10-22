import { inject } from "vue";
import { OverlayStack } from "../OverlayStack.ts";

export function useOverlayStack(): OverlayStack {
    return inject('overlay.stack');
}