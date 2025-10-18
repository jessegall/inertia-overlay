import { h } from "vue";
import { router, usePage } from "@inertiajs/vue3";
import { Page, PendingVisit } from "@inertiajs/core";
import { useOverlayRegistrar } from "./Composables/use-overlay-registrar";
import { useOverlayPage } from "./Composables/use-overlay-page";
import { useOverlay } from "./Composables/use-overlay";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { inertiaOverlayHeaders } from "./inertia-overlay-headers";
import { OverlayOptions } from "./inertia-overlay";

function mount(app: any) {
    const originalRender = app._component.render;
    app._component.render = function () {
        return h('div', null, [
            originalRender.call(this),
            h(OverlayRoot),
        ]);
    };
}

let rootUrl: string = null;

function injectOverlayHeaders(visit: PendingVisit) {
    const registrar = useOverlayRegistrar();

    if (registrar.hasOverlays()) {
        const overlay = useOverlay(registrar.activeOverlayId.value);

        visit.preserveScroll = true;

        if (! visit.only?.length && ! (overlay.index.value === 0 && overlay.hasStatus('closing'))) {
            visit.only = ['__overlay-partial-reload-trigger__'];
        }

        if (! rootUrl && overlay.index.value === 0 && overlay.hasStatus('opening')) {
            rootUrl = window.location.href;
        }

        visit.headers[inertiaOverlayHeaders.OVERLAY] = 'true';
        visit.headers[inertiaOverlayHeaders.OVERLAY_ID] = overlay.id;
        visit.headers[inertiaOverlayHeaders.OVERLAY_INDEX] = overlay.index.value.toString();
        visit.headers[inertiaOverlayHeaders.OVERLAY_STACK] = registrar.stack.value.join(',');
        visit.headers[inertiaOverlayHeaders.OVERLAY_PREVIOUS_URL] = overlay.previousUrl;
        visit.headers[inertiaOverlayHeaders.OVERLAY_ROOT_URL] = rootUrl;
        visit.headers[inertiaOverlayHeaders.OVERLAY_PAGE_COMPONENT] = usePage().component;
    } else {
        rootUrl = null;
    }
}

function registerOverlayOptions(page: Page & { overlay?: OverlayOptions }) {
    const { setOptions } = useOverlayPage();

    if (page.overlay) {
        setOptions(page.overlay);
    }
}

function compareOverlayId() {
    const { activeOverlayId, size } = useOverlayRegistrar();
    const { overlayQueryParam } = useOverlayPage();

    const overlayId = overlayQueryParam();

    if (overlayId && overlayId != activeOverlayId.value) {
        const delay = size() === 0 ? 0 : 300;

        setTimeout(() => {
            const overlay = useOverlay(overlayId);
            overlay.open();
        }, delay);
    }
}

export const inertiaOverlayPlugin = {

    install(app: any) {

        mount(app);
        compareOverlayId();

        router.on('before', event => {
            injectOverlayHeaders(event.detail.visit);
        });

        router.on('success', event => {
            registerOverlayOptions(event.detail.page);
            compareOverlayId();
        })

    }

}