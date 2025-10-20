import { ref } from "vue";
import { OverlayConfig } from "../inertia-overlay";
import { useSingleton } from "./use-singleton.ts";

const overlayPage = useSingleton(() => {
    const options = ref<OverlayConfig>(null);

    function overlayQueryParam() {
        const url = new URL(window.location.href);
        return url.searchParams.get('overlay') as string;
    }
    
    return {
        options,
        overlayQueryParam,
    }
});

export function useOverlayPage() {
    return overlayPage();
}