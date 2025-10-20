import { router, usePage } from "@inertiajs/vue3";
import { useOverlayRegistrar } from "./use-overlay-registrar.ts";
import { computed, nextTick, reactive } from "vue";
import { useEvent } from "./use-event.ts";
import { OverlayConfig, OverlayInstance, OverlayPage, OverlayState, OverlayStatus } from "../inertia-overlay";
import { GlobalEvent } from "@inertiajs/core";
import { clone } from "../helpers.ts";

interface UseOverlayOptions {
    autoOpen: boolean;
    destroyOnClose?: boolean;
}

const DEFAULT_OPTIONS: UseOverlayOptions = {
    autoOpen: true,
    destroyOnClose: true,
}

const instances = new Map<string, OverlayInstance>();

const onRouterSuccess = useEvent<GlobalEvent<'success'>>();

router.on('success', event => onRouterSuccess.trigger(event));

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
                nextTick(() => {
                    instance.destroy();
                    instances.delete(id);
                })
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

    const onRouterSuccessHandle = onRouterSuccess.listen({
        callback: handleOnRouterSuccess,
        priority: () => index.value,
    });

    // ----------[ Events ]----------

    const onStatusChange = useEvent<OverlayStatus>();
    const onFocus = useEvent<void>();
    const onBlur = useEvent<void>();

    // ----------[ Data ]----------

    const state = reactive<OverlayState>({
        focused: false,
        status: 'closed',
        config: null,
        props: {},
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

    function setConfig(config: OverlayConfig) {
        state.config = config;
    }

    function setProps(props: Record<string, any>) {
        for (const key of state.config.props) {
            state.props[key] = props[key];
        }
    }

    function isFocused(): boolean {
        return state.focused;
    }

    function isBlurred(): boolean {
        return ! state.focused;
    }

    function hasStatus(...status: OverlayStatus[]): boolean {
        return status.includes(state.status);
    }

    async function open() {
        if (! hasStatus('closed')) return;

        try {
            setStatus('opening');

            if (isBlurred()) {
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

            if (isFocused()) {
                await reload();
            }

            setStatus('closed');
        } catch {
            setStatus('open');
        }
    }

    function destroy() {
        onRouterSuccessHandle.stop();
        onStatusChange.clear();
        onFocus.clear();
        onBlur.clear();
    }

    function focus() {
        if (isFocused()) return;
        state.focused = true;
        onFocus.trigger();
    }

    function blur() {
        if (isBlurred()) return;
        state.focused = false;
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

    function restoreOverlayPageProps() {
        const page = usePage();
        for (const key of state.config.props) {
            page.props[key] = clone(state.props[key])
        }
    }

    function deleteOverlayPageProps() {
        const page = usePage();
        for (const key of state.config.props) {
            delete page.props[key];
        }
    }

    // ----------[ Event Handlers ]----------

    function handleOnRouterSuccess(event: GlobalEvent<'success'>) {
        const page = event.detail.page as OverlayPage;

        if (page.overlay?.id === id) {
            setConfig(page.overlay);

            if (hasStatus('open') && isBlurred()) {
                restoreOverlayPageProps();
            } else {
                setProps(page.props);
            }

            focus();
        } else {
            if (hasStatus('closing') && isFocused() && index.value > 0) {
                deleteOverlayPageProps();
            }

            blur();
        }
    }

    // ----------[ Api ]----------

    return {
        id, state, index,
        onStatusChange, onFocus, onBlur,
        open, close, hasStatus, destroy,
    }

}