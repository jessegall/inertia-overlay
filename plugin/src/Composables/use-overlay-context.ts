import { OverlayPage } from "../inertia-overlay";
import { useSingleton } from "./use-singleton.ts";
import { useEvent } from "./use-event.ts";
import { router } from "@inertiajs/vue3";
import { isOverlayPage } from "../helpers.ts";
import { ref } from "vue";
import { GlobalEvent } from "@inertiajs/core";

const overlayContext = useSingleton(() => {

    router.on('success', handleOnSuccess);

    // ----------[ Events ]----------

    const onPageReloaded = useEvent<OverlayPage>();

    // ----------[ Data ]----------

    const overlayPage = ref<OverlayPage>(null);

    // ----------[ Methods ]----------

    function overlayQueryParam() {
        const url = new URL(window.location.href);
        return url.searchParams.get('overlay') as string;
    }

    function isLoaded(overlayId: string): boolean {
        return overlayPage.value?.overlay.id === overlayId;
    }

    function getPage(): OverlayPage | null {
        return overlayPage.value;
    }

    // ----------[ Event Handlers ]----------

    function handleOnSuccess(event: GlobalEvent<'success'>) {
        const page = event.detail.page;

        if (isOverlayPage(page)) {
            overlayPage.value = page;
            onPageReloaded.trigger(page);
        } else {
            overlayPage.value = null;
        }
    }

    return {
        onPageReloaded,
        overlayQueryParam,
        isLoaded,
        getPage,
    }
});

export function useOverlayContext() {
    return overlayContext();
}