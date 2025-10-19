import { Component } from 'vue';

type ResolveComponent = (name: string) => Component | Promise<Component>;
export declare function createInertiaOverlayPlugin(resolve: ResolveComponent): {
    install(app: any): void;
};
export declare function getOverlayComponentResolver(): ResolveComponent;
export {};
