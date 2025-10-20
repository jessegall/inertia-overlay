import { Event, EventHandle, EventListener } from "../inertia-overlay";

export function useEvent<T>(): Event<T> {

    const listeners = new Map<string, EventListener<T>>();
    let index = 0;

    function generateListenerId() {
        index += 1;
        return index.toString();
    }

    function listen(listener: ((payload: T) => void) | EventListener<T>): EventHandle<T> {
        if (typeof listener === 'function') {
            listener = {
                callback: listener,
                priority: 0,
            };
        }

        const listenerId = generateListenerId();
        listeners.set(listenerId, listener);

        return {
            stop: () => remove(listenerId),
        }
    }

    function remove(listenerId: string) {
        listeners.delete(listenerId);
    }

    function trigger(payload: T) {
        const callbacks = Array.from(listeners.values())
            .sort((a, b) => {
                const priorityA = typeof a.priority === 'function' ? a.priority() : a.priority;
                const priorityB = typeof b.priority === 'function' ? b.priority() : b.priority;
                return priorityB - priorityA;
            })
            .map(l => l.callback);

        for (const callback of callbacks) {
            callback(payload);
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