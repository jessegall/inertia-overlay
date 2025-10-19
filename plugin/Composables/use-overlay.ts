import { router } from "@inertiajs/vue3";
import { useOverlayRegistrar } from "./use-overlay-registrar";
import { computed, nextTick, reactive, ref } from "vue";
import { useOverlayData } from "./use-overlay-data";
import { useOverlayEvent } from "./use-overlay-event";
import { inertiaOverlayHeaders } from "../inertia-overlay-headers";
import { OverlayHandle, OverlayState, OverlayStatus } from "../Types/inertia-overlay";

const instances = new Map<string, OverlayHandle>();

function overlay(id: string): OverlayHandle {

    const registrar = useOverlayRegistrar();
    const data = useOverlayData(id);

    // ----------[ Events ]----------

    const [onStatusChange, onStatusChangeTrigger] = useOverlayEvent<OverlayStatus>();

    // ----------[ State ]----------

    const state = reactive<OverlayState>({
        status: 'closed'
    })

    const previousUrl = ref<string>();

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
                previousUrl.value = window.location.href;
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
        if (! hasStatus('closed')) return;

        setStatus('opening');

        if (! data.isContextActive()) {
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
        if (! hasStatus('open')) return;

        setStatus('closing');

        if (data.isContextActive()) {
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

        get previousUrl() {
            return previousUrl.value;
        },

        get options() {
            return data.options.value;
        },

        get props() {
            return data.props.value;
        }

    }

}

function overlayId(type: string, args: Record<string, string> = {}) {

    if (Object.keys(args).length === 0) return type;

    const json = JSON.stringify(args);
    const base64 = btoa(decodeURI(encodeURIComponent(json)));
    return `${ type }:${ base64 }`;

}

type UseOverlayOptions = Record<string, string> & {
    autoOpen?: boolean;
};

export function useOverlay(id: string, options?: UseOverlayOptions): OverlayHandle;
export function useOverlay(type: string, args: Record<string, any>, options?: UseOverlayOptions): OverlayHandle;
export function useOverlay(idOrType: string, argsOrOptions?: Record<string, any> | UseOverlayOptions, options?: UseOverlayOptions): OverlayHandle {
    const hasArgs = argsOrOptions !== undefined && ! ('autoOpen' in argsOrOptions);
    const id = hasArgs ? overlayId(idOrType, argsOrOptions) : idOrType;
    const opts = hasArgs ? options : argsOrOptions as UseOverlayOptions;
    const shouldAutoOpen = opts?.autoOpen ?? true;

    if (! instances.has(id)) {
        instances.set(id, overlay(id));
    }

    const instance = instances.get(id);

    if (shouldAutoOpen) {
        instance.open();
    }

    return instance;
}