import { inject } from "vue";
import { CreateOverlayOptions, OverlayPlugin } from "../OverlayPlugin.ts";
import { OverlayProps } from "../Overlay.ts";

interface OverlayActionOptions {
    data?: Record<string, any>;
    onSuccess?: (data: OverlayProps) => void;
}

export function useOverlay() {

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    function createOverlay(options: CreateOverlayOptions) {
        return plugin.createOverlay(options);
    }

    async function overlayAction(action: string, options: OverlayActionOptions = {}) {
        const overlay = plugin.stack.peek();

        if (! overlay) {
            console.error('No overlay instance found for overlay action.');
            return;
        }

        if (! overlay.config.actions.includes(action)) {
            console.error(`Overlay action "${ action }" is not available for overlay "${ overlay.id }".`);
            return;
        }

        const page = await plugin.router.action(action, options.data);

        if (options.onSuccess) {
            options.onSuccess(overlay.unscopeData(page.props));
        }
    }

    return {
        createOverlay,
        overlayAction,
    }

}