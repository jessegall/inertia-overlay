import { App, h, nextTick } from "vue";
import { router, usePage } from "@inertiajs/vue3";
import { PendingVisit } from "@inertiajs/core";
import { useOverlayRegistrar } from "./Composables/use-overlay-registrar.ts";
import { useOverlayPage } from "./Composables/use-overlay-page.ts";
import { useOverlay } from "./Composables/use-overlay.ts";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { inertiaOverlayHeaders } from "./inertia-overlay-headers.ts";
import { OverlayPluginOptions } from "./types";

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

        visit.headers[inertiaOverlayHeaders.OVERLAY] = '1';
        visit.headers[inertiaOverlayHeaders.OVERLAY_INDEX] = overlay.index.value.toString();
        visit.headers[inertiaOverlayHeaders.OVERLAY_ROOT_URL] = rootUrl;
        visit.headers[inertiaOverlayHeaders.OVERLAY_PAGE_COMPONENT] = usePage().component;

        visit.headers[inertiaOverlayHeaders.OVERLAY_ID] = overlay.id;

        if (registrar.size() > 1) {
            visit.headers[inertiaOverlayHeaders.OVERLAY_PREVIOUS_ID] = registrar.stack.value[overlay.index.value - 1];
        }

        if (overlay.hasStatus('opening')) {
            visit.headers[inertiaOverlayHeaders.OVERLAY_OPENING] = '1';
        }

        if (overlay.hasStatus('closing')) {
            visit.headers[inertiaOverlayHeaders.OVERLAY_CLOSING] = '1';
        }
    } else {
        rootUrl = null;
    }
}

function compareOverlayId() {
    const registrar = useOverlayRegistrar();
    const page = useOverlayPage();

    const overlayId = page.overlayQueryParam();
    if (overlayId && ! registrar.hasOverlay(overlayId)) {
        const overlay = useOverlay(overlayId);
        overlay.open();
    }
}

export function createInertiaOverlayPlugin(options: OverlayPluginOptions) {

    function install(app: App) {
        app.config.globalProperties.$inertiaOverlay = options;

        mount(app);

        nextTick(() => {
            initialize();
            compareOverlayId();
        })
    }

    function initialize() {
        router.on('before', event => {
            injectOverlayHeaders(event.detail.visit);
        });

        router.on('success', () => {
            compareOverlayId();
        });
    }

    return {
        install,
    };
}