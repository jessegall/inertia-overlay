import { useOverlayFactory } from "./useOverlayFactory.ts";
import { useOverlayStack } from "./useOverlayStack.ts";
import { Overlay, OverlayArgs, OverlayType } from "../Overlay.ts";

interface CreateOverlayOptions {
    type: OverlayType;
    args: OverlayArgs
}

export function useOverlay() {

    const factory = useOverlayFactory();
    const stack = useOverlayStack();

    function createOverlay(options: CreateOverlayOptions): Overlay {
        const overlay = factory.create(options.type, options.args);
        stack.push(overlay);
        return overlay;
    }

    return {
        createOverlay,
    };

}