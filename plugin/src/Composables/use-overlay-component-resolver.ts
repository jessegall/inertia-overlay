import { Component, getCurrentInstance } from "vue";

export function useOverlayComponentResolver() {

    const instance = getCurrentInstance();

    if (! instance) {
        throw new Error('resolveOverlayComponent must be called within a Vue component setup function.');
    }

    async function resolve(typename: string): Promise<Component> {
        const resolver = instance.appContext.config.globalProperties.$inertiaOverlay?.resolve;

        if (! resolver) {
            throw new Error('Overlay component resolver not configured.');
        }

        const component = await resolver(typename)?.();

        if (! component) {
            throw new Error(`Overlay component for typename "${ typename }" not found.`);
        }

        if (typeof component === 'object' && 'default' in component) {
            return component.default;
        }

        return component;
    }

    return {
        resolve,
    }

}