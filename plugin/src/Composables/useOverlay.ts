import { inject } from "vue";
import { CreateOverlayOptions, OverlayPlugin } from "../OverlayPlugin.ts";

export function useOverlay() {

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    function createOverlay(options: CreateOverlayOptions) {
        return plugin.createOverlay(options);
    }

    function runAction(action: string) {
        plugin.router.run(action);
    }

    return {
        createOverlay,
        runAction,
    }

}