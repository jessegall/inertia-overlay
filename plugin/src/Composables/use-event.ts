import { Event, EventHandle, EventListener } from "../inertia-overlay";
import { reactive } from "vue";
import { useCounter } from "./use-counter.ts";
import { resolve } from "../helpers.ts";


export function useEvent<T>(): Event<T> {

    const listeners = reactive<Map<number, EventListener<T>>>(new Map());
    const counter = useCounter();

    // ----------[ Methods ]----------

    function listen(listener: ((payload: T) => void) | EventListener<T>): EventHandle<T> {
        const listenerId = counter.next();
        listeners.set(listenerId, createListener(listener));

        return {
            stop: () => remove(listenerId),
        }
    }

    function remove(listenerId: number) {
        listeners.delete(listenerId);
    }

    function trigger(payload: T) {
        const callbacks = Array.from(listeners.values())
            .sort((a, b) => resolve(b.priority) - resolve(a.priority))
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

function createListener<T>(listener: ((payload: T) => void) | EventListener<T>) {
    if (typeof listener === 'function') {
        return {
            callback: listener,
            priority: 0,
        };
    }

    return listener;
}