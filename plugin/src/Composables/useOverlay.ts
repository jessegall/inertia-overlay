import { inject } from "vue";
import { OverlayHandle, OverlayPlugin } from "../OverlayPlugin.ts";
import { OverlayProps } from "../Overlay.ts";
import { unscopeData } from "../helpers.ts";

type CreateOverlayOptions = string | {
    props?: OverlayProps;
    component?: string;
}

type OverlayActionOptions = {
    data?: Record<string, any>;
    onSuccess?: (data: OverlayProps) => void;
}


export function useOverlay() {

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    function createOverlay(options: CreateOverlayOptions): OverlayHandle {
        if (typeof options === 'string') {
            return plugin.createOverlayFromUrl(options);
        }

        return plugin.createOverlayFromComponent(options.component, options.props);
    }

    async function overlayAction(action: string, options: OverlayActionOptions = {}): Promise<void> {
        const overlay = plugin.stack.peek();

        if (! overlay) {
            console.error('No overlay instance found for overlay action.');
            return;
        }

        const page = await plugin.router.action(overlay.id, action, options.data);

        if (options.onSuccess) {
            options.onSuccess(unscopeData(overlay.id, page.props));
        }
    }

    return {
        createOverlay,
        overlayAction,
    }

}