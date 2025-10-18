import { ref } from "vue";
import { OverlayOptions } from "../inertia-overlay";

function makeOverlayPage() {
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
}

let overlayPage: ReturnType<typeof makeOverlayPage> = null;

export function useOverlayPage() {
    if (! overlayPage) {
        overlayPage = makeOverlayPage();
    }
    return overlayPage;
}