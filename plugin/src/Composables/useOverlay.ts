import { inject } from "vue";
import { OverlayHandle, OverlayPlugin } from "../OverlayPlugin.ts";
import { OverlayProps } from "../Overlay.ts";
import { CreateOverlayOptions } from "../OverlayFactory.ts";
import { unscopeData } from "../helpers.ts";

interface OverlayActionOptions {
    data?: Record<string, any>;
    onSuccess?: (data: OverlayProps) => void;
}

export function useOverlay() {

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    function createOverlay(options: CreateOverlayOptions): OverlayHandle {
        return plugin.createOverlay(options);
    }

    async function overlayAction(action: string, options: OverlayActionOptions = {}): Promise<void> {
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
            options.onSuccess(unscopeData(overlay.instanceId, page.props));
        }
    }

    return {
        createOverlay,
        overlayAction,
    }

}