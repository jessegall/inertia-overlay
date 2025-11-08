import { computed, getCurrentInstance, inject, onBeforeUnmount, reactive, shallowRef } from "vue";
import { OverlayPlugin } from "../OverlayPlugin.ts";
import { OverlayProps, OverlayStatus } from "../Overlay.ts";
import { ReactiveOverlay } from "../OverlayFactory.ts";
import { VisitOptions } from "@inertiajs/core";

type OverlayActionOptions = {
    data?: Record<string, any>;
    headers?: Record<string, string>;
    onSuccess?: (data: OverlayProps) => void;
}

type OverlayFromComponentOptions = {
    component: string;
    props?: Record<string, any>;
}

export interface OverlayHandle {
    id: string | undefined;
    state: OverlayStatus;
    open: () => Promise<void>;
    close: () => Promise<void>;
}

export function useOverlay() {

    // ----------[ Dependencies ]----------

    const plugin = inject<OverlayPlugin>('overlay.plugin');

    // ----------[ Data ]----------

    const instance = shallowRef<ReactiveOverlay>(null);

    // ----------[ Methods ]----------

    function createOverlay(url: string | URL, data: Record<string, any>): OverlayHandle {
        return reactive({
            id: computed(() => instance.value?.id),
            state: computed(() => instance.value?.status || 'closed'),
            open: async () => {
                if (instance.value) return;
                instance.value = await plugin.visitOverlay(url, {
                    data,
                    onClose() {
                        instance.value = null;
                    }
                });
            },
            close: async () => {
                if (! instance.value) return;
                await instance.value.close();
            },
        });
    }

    function createOverlayFromComponent(options: OverlayFromComponentOptions) {
        const url = new URL(`/overlay/render/${ options.component }`, window.location.origin);
        return createOverlay(url, options.props || {});
    }

    async function overlayAction(action: string, options: VisitOptions = {}): Promise<void> {
        const overlay = plugin.stack.peek();

        if (! overlay) {
            console.error('No overlay instance found for overlay action.');
            return;
        }

        await plugin.router.action(overlay.id, action, options);
    }

    // ----------[ Lifecycle ]----------

    onBeforeUnmount(() => {
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