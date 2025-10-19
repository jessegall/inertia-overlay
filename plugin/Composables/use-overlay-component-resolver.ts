import { Component } from "vue";
import { getOverlayComponentResolver } from "../inertia-overlay-plugin";

export function useOverlayComponentResolver() {

    async function resolve(type: string): Promise<Component> {
        const resolver = getOverlayComponentResolver();

        if (! resolver) {
            throw new Error('Overlay component resolver not configured. Use createInertiaOverlayPlugin()');
        }

        const component = await resolver(type);

        return typeof component === 'object' && 'default' in component
            ? component.default
            : component;
    }

    return {
        resolve,
    }

}