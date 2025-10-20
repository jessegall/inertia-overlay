import { OverlayStatus } from "./inertia-overlay";
import { getCurrentOverlayInstance } from "./helpers.ts";

type InertiaOverlayHook = () => void;

function createStatusHook(status: OverlayStatus, hook: InertiaOverlayHook): VoidFunction {
    const instance = getCurrentOverlayInstance();

    return instance.onStatusChange.listen((newStatus) => {
        if (status === newStatus) {
            hook();
        }
    });
}

export function onBeforeOverlayClose(hook: InertiaOverlayHook): VoidFunction {
    return createStatusHook('closing', hook);
}

export function onOverlayClosed(hook: InertiaOverlayHook): VoidFunction {
    return createStatusHook('closed', hook);
}

export function onOverlayFocused(hook: InertiaOverlayHook): VoidFunction {
    const instance = getCurrentOverlayInstance();

    return instance.onFocus.listen(() => {
        hook();
    });
}

export function onOverlayBlurred(hook: InertiaOverlayHook): VoidFunction {
    const instance = getCurrentOverlayInstance();

    return instance.onBlur.listen(() => {
        hook();
    });
}
