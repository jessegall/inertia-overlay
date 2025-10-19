import { usePage } from "@inertiajs/vue3";
import { computed, ref } from "vue";
import { OverlayOptions } from "../Types/inertia-overlay";
import { useOverlayRegistrar } from "./use-overlay-registrar";
import { useOverlayPage } from "./use-overlay-page";

export function useOverlayData(id: string) {

    const registrar = useOverlayRegistrar();
    const page = usePage();

    // ----------[ Data ]----------

    const cachedOptions = ref<OverlayOptions>();
    const cachedProps = ref<Record<string, any>>({});

    // ----------[ Methods ]----------

    function isContextActive(): boolean {
        const url = new URL(`${ window.location.host }${ page.url }`);

        return url.searchParams.has('overlay', id)
            && useOverlayPage().options.value?.id === id
            && registrar.activeOverlayId.value === id;
    }

    function computeOptions(): OverlayOptions {
        if (! isContextActive()) return cachedOptions.value;

        const { options } = useOverlayPage();
        cachedOptions.value = options.value;
        return options.value;
    }

    function computeProps(): Record<string, any> {
        if (! isContextActive()) return cachedProps.value;

        const { options } = useOverlayPage();
        const props: Record<string, any> = {};

        for (const key of options.value.props) {
            props[key] = cachedProps.value[key] ?? page.props[key];
        }

        cachedProps.value = page.props;

        return props;
    }

    return {
        options: computed(computeOptions),
        props: computed(computeProps),
        isContextActive,
    }

}