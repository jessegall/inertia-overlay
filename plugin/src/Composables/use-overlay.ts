import { router } from "@inertiajs/vue3";
import { useOverlayRegistrar } from "./use-overlay-registrar.ts";
import { computed, reactive } from "vue";
import { useOverlayData } from "./use-overlay-data.ts";
import { useEvent } from "./use-event.ts";
import { OverlayInstance, OverlayState, OverlayStatus } from "../inertia-overlay";

interface UseOverlayOptions {
    autoOpen: boolean;
    destroyOnClose?: boolean;
}

const DEFAULT_OPTIONS: UseOverlayOptions = {
    autoOpen: true,
    destroyOnClose: true,
}

const instances = new Map<string, OverlayInstance>();

export function useOverlay(typename: string, args: Record<string, any> = {}, options: Partial<UseOverlayOptions> = {}): OverlayInstance {
    options = {
        ...DEFAULT_OPTIONS,
        ...options
    };

    const id = generateOverlayId(typename, args);

    if (instances.has(id)) {
        return instances.get(id);
    }

    const instance = createOverlay(id);

    instances.set(id, instance);

    if (options.destroyOnClose) {
        instance.onStatusChange.listen((status) => {
            if (status === 'closed') {
                instance.destroy();
                instances.delete(id);
            }
        });
    }

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

function createOverlay(id: string): OverlayInstance {

    const registrar = useOverlayRegistrar();
    const data = useOverlayData(id);

    registrar.onStackChange.listen(onRegistrarStackChange);

    // ----------[ Events ]----------

    const onStatusChange = useEvent<OverlayStatus>();
    const onFocus = useEvent<void>();
    const onBlur = useEvent<void>();

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
        state.status = status;

        switch (status) {

            case 'opening':
                registrar.register(id);
                break;

            case 'closed':
                registrar.unregister(id);
                break;

        }

        onStatusChange.trigger(status);
    }

    function hasStatus(...status: OverlayStatus[]): boolean {
        return status.includes(state.status);
    }

    async function open() {
        if (! hasStatus('closed')) return;

        try {
            setStatus('opening');

            if (! data.isContextActive()) {
                await reload();
            }

            setStatus('open');
        } catch (error) {
            setStatus('closed');
        }
    }

    async function close() {
        if (! hasStatus('open')) return;

        try {
            setStatus('closing');

            if (data.isContextActive()) {
                await reload();
            }

            setStatus('closed');
        } catch {
            setStatus('open');
        }
    }

    function destroy() {
        registrar.onStackChange.remove(onRegistrarStackChange);
        onStatusChange.clear();
        onFocus.clear();
        onBlur.clear();
    }

    function focus() {
        onFocus.trigger();
    }

    function blur() {
        onBlur.trigger();
    }

    async function reload() {
        await new Promise((resolve, error) => {
            router.reload({
                data: {
                    overlay: id,
                },
                onSuccess: resolve,
                onError: error,
            });
        })
    }

    // ----------[ Event Handlers ]----------

    function onRegistrarStackChange(stack: string[]) {
        if (id === stack[stack.length - 1]) {
            focus();
        } else if (id === stack[stack.length - 2]) {
            blur();
        }
    }

    // ----------[ Api ]----------

    return {

        id, state, index,

        onStatusChange, onFocus, onBlur,

        open, close, hasStatus, destroy,

        get options() {
            return data.options.value;
        },

        get props() {
            return data.props.value;
        }

    }

}