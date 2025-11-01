import { inject, onUnmounted } from "vue";
import { OverlayStack } from "./OverlayStack.ts";
import { ReactiveOverlay } from "./OverlayFactory.ts";
import { Unsubscribe } from "./event.ts";

type Hook = (overlay: ReactiveOverlay, callback: () => void) => Unsubscribe;


function hookFactory(hook: Hook) {
    return (callback: () => void) => {
        const stack = inject<OverlayStack>('overlay.stack');
        const overlay = stack.peek();

        if (! overlay) {
            throw new Error('Can not create hook context without an active overlay.');
        }

        const unsubscribe = hook(overlay, callback);

        onUnmounted(unsubscribe);
    };
}

export const onBeforeOverlayClose = hookFactory((overlay, callback) => {
    return overlay.onStatusChange.listen({
        handler: callback,
        filter: state => state === 'closing',
    })
});

export const onOverlayClosed = hookFactory((overlay, callback) => {
    return overlay.onStatusChange.listen({
        handler: callback,
        filter: state => state === 'closed',
    })
});

export const onOverlayFocus = hookFactory((overlay, callback) => {
    return overlay.onFocused.listen(callback);
});

export const onOverlayBlur = hookFactory((overlay, callback) => {
    return overlay.onBlurred.listen(callback);
});