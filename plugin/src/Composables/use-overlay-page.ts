import { ref } from "vue";
import { OverlayOptions } from "../inertia-overlay";
import { useSingleton } from "./use-singleton.ts";

const overlayPage = useSingleton(() => {
    const options = ref<OverlayOptions>(null);

    function overlayQueryParam() {
        const url = new URL(window.location.href);
        return url.searchParams.get('overlay') as string;
    }

    function setOptions(next: OverlayOptions) {
        options.value = next;
    }

    return {
        options,
        overlayQueryParam,
        setOptions,
    }
});

export function useOverlayPage() {
    return overlayPage();
}