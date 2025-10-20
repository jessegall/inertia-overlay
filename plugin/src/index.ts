import './style.css';

export { createInertiaOverlayPlugin } from './inertia-overlay-plugin.ts';
export { useOverlay } from './Composables/use-overlay.ts';
export { onOverlayClosed, onBeforeOverlayClose, onOverlayFocused, onOverlayBlurred } from './inertia-overlay-hooks.ts';
export type { OverlayVariant, OverlayStatus } from './inertia-overlay.d.ts';
export type * from './types.d.ts';

