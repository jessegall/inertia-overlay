import { computed, readonly, ref } from "vue";
import { useSingleton } from "./use-singleton.ts";
import { useEvent } from "./use-event.ts";

const overlayRegistrar = useSingleton(() => {

    // ----------[ Events ]----------

    const onStackChange = useEvent<string[]>();

    // ----------[ Data ]----------

    const stack = ref<string[]>([]);

    // ----------[ Methods ]----------

    function register(id: string) {
        if (hasOverlay(id)) return;
        stack.value.push(id);
        onStackChange.trigger([...stack.value]);
    }

    function unregister(id: string) {
        if (! hasOverlay(id)) return;
        stack.value = stack.value.filter(i => i !== id);
        onStackChange.trigger([...stack.value]);
    }

    function hasOverlay(id: string) {
        return stack.value.includes(id);
    }

    function hasOverlays() {
        return stack.value.length > 0;
    }

    function size() {
        return stack.value.length;
    }

    // ----------[ Api ]----------

    return {

        onStackChange,

        register,
        unregister,
        hasOverlay,
        hasOverlays,
        size,

        stack: readonly(stack),

        activeOverlayId: computed(() => {
            if (! hasOverlays()) return null;
            return stack.value[stack.value.length - 1];
        }),

    }

});

export function useOverlayRegistrar() {
    return overlayRegistrar();
}