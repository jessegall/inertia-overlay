import { OverlayEvent } from "../inertia-overlay";

export function useOverlayEvent<T>(): OverlayEvent<T> {

    const listeners = new Set<(payload: T) => any>();

    function listen(listener: (payload: T) => void): VoidFunction {
        listeners.add(listener);
        return () => remove(listener);
    }

    function remove(listener: (payload: T) => void) {
        listeners.delete(listener);
    }

    function trigger(payload: T) {
        listeners.forEach(listener => {
            listener(payload);
        });
    }

    return [
        {
            listen,
            remove
        },
        trigger
    ];

}