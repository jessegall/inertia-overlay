import { ref } from "vue";
import { OverlayOptions } from "../Types/inertia-overlay";

export type OverlayPage = ReturnType<typeof makeOverlayPage>;

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

let overlayPage: OverlayPage = null;

export function useOverlayPage(): OverlayPage {
    if (! overlayPage) {
        overlayPage = makeOverlayPage();
    }
    return overlayPage;
}