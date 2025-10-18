import { computed, readonly, ref } from "vue";

function makeOverlayRegister() {

    // ----------[ Data ]----------

    const stack = ref<string[]>([]);

    // ----------[ Methods ]----------

    function register(id: string) {
        if (hasOverlay(id)) return;
        stack.value.push(id);
    }

    function unregister(id: string) {
        if (! hasOverlay(id)) return;
        stack.value = stack.value.filter(i => i !== id);
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

}

let register: ReturnType<typeof makeOverlayRegister> = null;

export function useOverlayRegistrar() {
    if (! register) {
        register = makeOverlayRegister();
    }

    return register;
}