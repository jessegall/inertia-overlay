import { router } from "@inertiajs/vue3";
import { useOverlayRegistrar } from "./use-overlay-registrar.ts";
import { computed, nextTick, reactive } from "vue";
import { useOverlayData } from "./use-overlay-data.ts";
import { useEvent } from "./use-event.ts";
import { OverlayInstance, OverlayState, OverlayStatus } from "../inertia-overlay";

interface UseOverlayOptions {
    autoOpen: boolean;
    destroyOnClose?: boolean;
}

interface ReloadOptions {
    onSuccess?: () => void;
    onError?: () => void;
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

    if (! instances.has(id)) {
        instances.set(id, createOverlay(id));
    }

    const instance = instances.get(id);

    if (options.destroyOnClose) {
        instance.onStatusChange.listen((status) => {
            if (status === 'closed') {
                instances.delete(id);
                instance.destroy();
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

    const [onStatusChange, onStatusChangeTrigger] = useEvent<OverlayStatus>();
    const [onFocus, onFocusTrigger] = useEvent<void>();
    const [onBlur, onBlurTrigger] = useEvent<void>();

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

        onStatusChangeTrigger(status);
    }

    function hasStatus(...status: OverlayStatus[]): boolean {
        return status.includes(state.status);
    }

    function open() {
        if (! hasStatus('closed')) return;

        setStatus('opening');

        load({
            onSuccess: () => setStatus('open'),
            onError: () => setStatus('closed'),
        });
    }

    function close() {
        if (! hasStatus('open')) return;

        setStatus('closing');

        unload({
            onSuccess: () => setStatus('closed'),
            onError: () => setStatus('open'),
        });
    }

    function focus() {
        onFocusTrigger();
    }

    function blur() {
        onBlurTrigger();
    }

    function load(options: ReloadOptions) {
        if (! data.isContextActive()) {
            router.reload({
                data: { overlay: id },
                ...options,
            })
        } else {
            nextTick(() => options?.onSuccess());
        }
    }

    function unload(options: ReloadOptions) {
        if (data.isContextActive()) {
            router.reload(options);
        } else {
            nextTick(() => options?.onSuccess());
        }
    }

    function destroy() {
        registrar.onStackChange.remove(onRegistrarStackChange);
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