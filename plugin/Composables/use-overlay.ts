import { router } from "@inertiajs/vue3";
import { useOverlayRegistrar } from "./use-overlay-registrar";
import { computed, nextTick, reactive, ref } from "vue";
import { useOverlayContext } from "./use-overlay-context";
import { useOverlayEvent } from "./use-overlay-event";
import { inertiaOverlayHeaders } from "../inertia-overlay-headers";
import { OverlayHandle, OverlayState, OverlayStatus } from "../inertia-overlay";

const instances = new Map<string, OverlayHandle>();

function overlay(id: string): OverlayHandle {

    const registrar = useOverlayRegistrar();
    const context = useOverlayContext(id);

    // ----------[ Events ]----------

    const [onStatusChange, onStatusChangeTrigger] = useOverlayEvent<OverlayStatus>();

    // ----------[ State ]----------

    const state = reactive<OverlayState>({
        status: 'closed'
    })

    const rootUrl = ref<string>();

    // ----------[ Computed ]----------

    const index = computed(() => {
        return registrar.stack.value.indexOf(id);
    });

    // ----------[ Methods ]----------

    function setStatus(status: OverlayStatus) {
        console.log(`Overlay [${ id }] status changed to: ${ status }`);

        state.status = status;

        switch (status) {

            case 'opening':
                registrar.register(id);
                rootUrl.value = window.location.href;
                break;

            case 'closed':
                registrar.unregister(id);
                break;

        }

        onStatusChangeTrigger(status);
    }

    function hasStatus(...status: OverlayStatus[]): boolean {
        return status.includes(state.status);
    }

    function open() {
        if (hasStatus('opening', 'open')) return;

        setStatus('opening');

        if (! context.isContextActive()) {
            router.reload({
                headers: {
                    [inertiaOverlayHeaders.OVERLAY_OPENING_ID]: id,
                },
                data: {
                    overlay: id,
                },
                onSuccess() {
                    setStatus('open');
                },
                onError: () => {
                    setStatus('closed');
                }
            })
        } else {
            nextTick(() => setStatus('open'));
        }
    }

    function close() {
        if (hasStatus('closing', 'closed')) return;

        setStatus('closing');

        if (context.isContextActive()) {
            const start = Date.now();

            router.reload({
                headers: {
                    [inertiaOverlayHeaders.OVERLAY_CLOSING_ID]: id,
                },
                onSuccess() {
                    const minDuration = 250;
                    const elapsed = Date.now() - start;
                    const delay = Math.max(0, minDuration - elapsed);

                    setTimeout(() => setStatus('closed'), delay);
                },
                onError() {
                    setStatus('open');
                },
            })
        } else {
            nextTick(() => setStatus('closed'));
        }
    }

    return {

        id, state, index,

        onStatusChange,

        open, close, hasStatus,

        get rootUrl() {
            return rootUrl.value;
        },

        get options() {
            return context.options.value;
        },

        get props() {
            return context.props.value;
        }

    }

}

function overlayId(type: string, args: Record<string, string> = {}) {

    if (Object.keys(args).length === 0) return type;

    const json = JSON.stringify(args);
    const base64 = btoa(decodeURI(encodeURIComponent(json)));
    return `${ type }:${ base64 }`;

}

export function useOverlay(id: string): OverlayHandle;
export function useOverlay(type: string, args: Record<string, any>): OverlayHandle;
export function useOverlay(idOrType: string, args?: Record<string, any>): OverlayHandle {
    const id = args !== undefined ? overlayId(idOrType, args) : idOrType;

    if (! instances.has(id)) {
        const instance = overlay(id);
        instances.set(id, instance);
    }

    return instances.get(id);
}
