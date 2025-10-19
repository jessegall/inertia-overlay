import { Component } from "vue";

export interface OverlayPluginOptions {
    resolve: (type: string) => () => Promise<Component>;
}

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