import { inject } from "vue";
import { OverlayHandle, OverlayPlugin } from "../OverlayPlugin.ts";
import { OverlayArgs, OverlayProps } from "../Overlay.ts";
import { unscopeData } from "../helpers.ts";

type CreateOverlayOptions = {
    args: OverlayArgs;
}

type CreateTypedOverlayOptions = CreateOverlayOptions & {
    type: string;
}

type CreateUrlOverlayOptions = CreateOverlayOptions & {
    url: string;
}

type OverlayActionOptions = {
    args?: Record<string, any>;
    onSuccess?: (data: OverlayProps) => void;
}

export function useOverlay() {

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    function createOverlay(options: CreateUrlOverlayOptions | CreateTypedOverlayOptions): OverlayHandle {
        if ('type' in options) {
            return plugin.createOverlayFromType(options.type, options.args);
        }
        
        return plugin.createOverlay(options.url, options.args);
    }

    async function overlayAction(action: string, options: OverlayActionOptions = {}): Promise<void> {
        const overlay = plugin.stack.peek();

        if (! overlay) {
            console.error('No overlay instance found for overlay action.');
            return;
        }

        const page = await plugin.router.action(overlay.id, action, options.args);

        if (options.onSuccess) {
            options.onSuccess(unscopeData(overlay.id, page.props));
        }
    }

    return {
        createOverlay,
        overlayAction,
    }

}