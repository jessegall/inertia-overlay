import "./style.css";
import { OverlayPlugin, OverlayPluginOptions } from "./OverlayPlugin.ts";

export { useOverlayFactory } from './Composables/useOverlayFactory.ts';
export { useOverlayStack } from './Composables/useOverlayStack.ts';
export { useOverlay } from './Composables/useOverlay.ts';

export function createInertiaOverlayPlugin(options: OverlayPluginOptions): OverlayPlugin {
    return new OverlayPlugin(options);
}