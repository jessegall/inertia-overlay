import { router } from "@inertiajs/vue3";
import { useOverlayRegistrar } from "./use-overlay-registrar.ts";
import { computed, nextTick, reactive } from "vue";
import { useOverlayData } from "./use-overlay-data.ts";
import { useOverlayEvent } from "./use-overlay-event.ts";
import { OverlayHandle, OverlayState, OverlayStatus } from "../inertia-overlay";

interface UseOverlayOptions {
    autoOpen: boolean;
}

const DEFAULT_OPTIONS: UseOverlayOptions = {
    autoOpen: true,
}

const instances = new Map<string, OverlayHandle>();

export function useOverlay(typename: string, args: Record<string, any> = {}, options: Partial<UseOverlayOptions> = {}): OverlayHandle {
    options = {
        ...DEFAULT_OPTIONS,
        ...options
    };

    const id = generateOverlayId(typename, args);

    if (! instances.has(id)) {
        instances.set(id, createOverlay(id));
    }

    const instance = instances.get(id);

    if (options.autoOpen) {
        instance.open();
    }

    return instance;
}

function generateOverlayId(typename: string, args: Record<string, string> = {}) {
    if (Object.keys(args).length === 0) return typename;

    const json = JSON.stringify(args);
    const encoded = encodeURIComponent(json);
    const base64 = btoa(encoded);

    return `${ typename }:${ base64 }`;
}

function createOverlay(id: string): OverlayHandle {

    const registrar = useOverlayRegistrar();
    const data = useOverlayData(id);

    // ----------[ Events ]----------

    const [onStatusChange, onStatusChangeTrigger] = useOverlayEvent<OverlayStatus>();

    // ----------[ State ]----------

    const state = reactive<OverlayState>({
        status: 'closed'
    })

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

        get options() {
            return data.options.value;
        },

        get props() {
            return data.props.value;
        }

    }

}