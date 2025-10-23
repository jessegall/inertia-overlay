import { inject } from "vue";
import { CreateOverlayOptions, OverlayPlugin } from "../OverlayPlugin.ts";

export function useOverlay() {

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    function createOverlay(options: CreateOverlayOptions) {
        return plugin.createOverlay(options);
    }

    function overlayAction(action: string, data: Record<string, any> = {}) {
        plugin.router.action(action, data);
    }

    return {
        createOverlay,
        overlayAction,
    }

}