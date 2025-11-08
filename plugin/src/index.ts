import "./style.css";
import { OverlayPlugin, OverlayPluginOptions } from "./OverlayPlugin.ts";
import OverlayRoot from "./Components/OverlayRoot.vue";
import { h, VNode } from "vue";

export { useOverlayFactory } from './Composables/useOverlayFactory.ts';
export { useOverlayStack } from './Composables/useOverlayStack.ts';
export { useOverlay } from './Composables/useOverlay.ts';
export {
    onOverlayFocus, onOverlayBlur, onOverlayClose
} from './Hooks.ts';

export type * from "./Overlay.ts";

export type WithInertiaOverlay<T = any> = (node: T) => () => VNode
export type CreateInertiaOverlayPluginFn = typeof createInertiaOverlayPlugin;

export function createInertiaOverlayPlugin(options: OverlayPluginOptions) {
    return {
        inertiaOverlayPlugin: new OverlayPlugin(options),
        inertiaOverlayRenderer: ((node: () => any) => () => h(OverlayRoot, node)) as WithInertiaOverlay
    }
}