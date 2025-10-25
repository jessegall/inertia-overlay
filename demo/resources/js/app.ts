import '../css/app.css';

import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { DefineComponent } from 'vue';
import { createApp, h } from 'vue';
import { createInertiaOverlayPlugin } from "@jessegall/inertia-overlay";
import "../../../plugin/build/style.css";

const appName = import.meta.env.VITE_APP_NAME || 'Inertia Overlay Demo App';

createInertiaApp({
    title: (title) => (title ? `${ title } - ${ appName }` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${ name }.vue`,
            import.meta.glob<DefineComponent>('./pages/**/*.vue'),
        ),
    setup({ el, App, props, plugin }) {

        const { inertiaOverlayPlugin, inertiaOverlayRenderer } = createInertiaOverlayPlugin({
            resolve: type => {
                const overlays = import.meta.glob('./overlays/**/*.vue');
                return overlays[`./overlays/${ type }.vue`];
            }
        });

        createApp({ render: inertiaOverlayRenderer(() => h(App, props)) })
            .use(inertiaOverlayPlugin)
            .use(plugin)
            .mount(el);
    },
    progress: {
        color: '#4B5563',
    },
});

