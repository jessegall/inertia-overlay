import { useOverlayRegistrar } from "./Composables/use-overlay-registrar.ts";
import { useOverlay } from "./Composables/use-overlay.ts";

export function getCurrentOverlayInstance() {
    const registrar = useOverlayRegistrar();

    if (! registrar.hasOverlays()) {
        throw new Error('No active overlay instance found.');
    }

    return useOverlay(registrar.activeOverlayId.value);
}

export function clone(value: any): any {
    return JSON.parse(JSON.stringify(value));
}