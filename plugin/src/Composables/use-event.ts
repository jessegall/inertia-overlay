import { Event } from "../inertia-overlay";

export function useEvent<T>(): Event<T> {

    const listeners = new Set<(payload: T) => any>();

    function listen(listener: (payload: T) => void): VoidFunction {
        listeners.add(listener);
        return () => remove(listener);
    }

    function remove(listener: (payload: T) => void) {
        listeners.delete(listener);
    }

    function trigger(payload: T) {
        for (const listener of Array.from(listeners)) {
            listener(payload);
        }
    }

    function clear() {
        listeners.clear();
    }

    return {
        listen,
        remove,
        trigger,
        clear,
    };

}