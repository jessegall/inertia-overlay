export interface OverlayEventListeners<T> {
    listen: (listener: (payload: T) => void) => VoidFunction;
    remove: (listener: (payload: T) => void) => void;
}

export type OverlayEvent<T> = [
    listeners: OverlayEventListeners<T>,
    trigger: (payload: T) => void
]

export function useOverlayEvent<T>(): OverlayEvent<T> {

    const listeners = new Set<(payload: T) => any>();

    function register(listener: (payload: T) => void): VoidFunction {
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

    return [{ listen: register, remove, }, trigger];

}