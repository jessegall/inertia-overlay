import { computed, inject, onUnmounted, reactive, shallowRef } from "vue";
import { OverlayPlugin } from "../OverlayPlugin.ts";
import { OverlayProps, OverlayState } from "../Overlay.ts";
import { ReadonlyOverlay } from "../OverlayFactory.ts";

type OverlayActionOptions = {
    data?: Record<string, any>;
    onSuccess?: (data: OverlayProps) => void;
}

type OverlayFromComponentOptions = {
    component: string;
    props?: Record<string, any>;
}

export interface OverlayHandle {
    id: string | undefined;
    state: OverlayState;
    open: () => Promise<void>;
    close: () => Promise<void>;
}

export function useOverlay() {

    // ----------[ Dependencies ]----------

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    // ----------[ Data ]----------

    const instance = shallowRef<ReadonlyOverlay>(null);

    // ----------[ Methods ]----------

    function createOverlay(url: string | URL, data: Record<string, any>): OverlayHandle {

        // We create a fresh overlay instance on each open() to prevent memory leaks.
        // While overlays can technically be reopened, destroying and recreating ensures
        // event listeners, subscriptions, and state are properly cleaned up.

        return reactive({
            id: computed(() => instance.value?.id),
            state: computed(() => instance.value?.state || 'closed'),
            open: async () => {
                if (instance.value) return;

                instance.value = plugin.newInstance(url, data, {
                    onClose: () => {
                        instance.value = null;
                    }
                });

                await instance.value.open();
            },
            close: async () => {
                if (! instance.value) return;
                await instance.value.close();
            },
        });
    }

    function createOverlayFromComponent(options: OverlayFromComponentOptions) {
        const url = new URL(`/overlay/${ options.component }`, window.location.origin);
        return createOverlay(url, options.props || {});
    }

    async function overlayAction(action: string, options: OverlayActionOptions = {}): Promise<void> {
        const overlay = plugin.stack.peek();

        if (! overlay) {
            console.error('No overlay instance found for overlay action.');
            return;
        }

        const page = await plugin.router.action(overlay.id, action, options.data);

        if (options.onSuccess) {
            options.onSuccess(page.props[overlay.id]);
        }
    }

    // ----------[ Lifecycle ]----------

    onUnmounted(() => {
        if (instance.value) {
            instance.value.close();
        }
    })

    return {
        createOverlay,
        createOverlayFromComponent,
        overlayAction,
    }

}