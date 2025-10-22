import { inject } from "vue";
import { CreateOverlayOptions, OverlayPlugin } from "../OverlayPlugin.ts";

export function useOverlay() {

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    function createOverlay(options: CreateOverlayOptions) {
        return plugin.createOverlay(options);
    }

    return {
        createOverlay
    }

}