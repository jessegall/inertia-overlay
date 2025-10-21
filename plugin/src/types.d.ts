export {};

declare module 'vue' {
    interface ComponentCustomProperties {
        $inertiaOverlay: OverlayPluginOptions;
    }
}

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $inertiaOverlay: OverlayPluginOptions;
    }
}