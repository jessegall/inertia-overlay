import { randomString } from "./helpers.ts";

export interface Listener<T = any> {
    handler: (payload: T) => void;
    filter?: (payload: T) => boolean;
    priority?: number | (() => number);
    subscription?: EventSubscription;
}

export interface ListenerWithGuard<T, S extends T> {
    handler: (payload: S) => void;
    filter: (payload: T) => payload is S;
    priority?: number | (() => number);
    subscription?: EventSubscription;
}

export interface Unsubscribe {
    (): void;
}

export type ListenerInput<T = any> = ((payload: T) => void) | Listener<T>;

export class EventEmitter<T = any> {

    private listeners: Map<string, Listener<T>> = new Map();

    public on<S extends T>(listener: ListenerWithGuard<T, S>): Unsubscribe;
    public on(listener: ListenerInput<T>): Unsubscribe;
    public on(listener: ListenerInput<T> | ListenerWithGuard<T, any>): Unsubscribe {
        listener = this.createListener(listener);

        const listenerId = randomString();
        this.listeners.set(listenerId, listener);

        const unsubscribe = () => this.unsubscribe(listenerId);

        if (listener.subscription) {
            listener.subscription.add(unsubscribe);
        }

        return unsubscribe;
    }

    public clear() {
        this.listeners.clear();
    }

    public unsubscribe(listenerId: string) {
        this.listeners.delete(listenerId);
    }

    public emit(payload: T) {
        const listeners = Array.from(this.listeners.values())
            .sort((a, b) => this.resolvePriority(b) - this.resolvePriority(a));

        for (const listener of listeners) {
            if (listener.filter && ! listener.filter(payload)) {
                continue;
            }

            listener.handler(payload);
        }
    }

    private createListener(listener: ListenerInput<T> | ListenerWithGuard<T, any>): Listener<T> {
        if (typeof listener === 'function') {
            return {
                handler: listener,
                priority: 0,
            };
        }

        return {
            priority: 0,
            ...listener,
        }
    }

    private resolvePriority(listener: Listener<T>): number {
        return typeof listener.priority === 'function' ? listener.priority() : listener.priority;
    }

}

export class EventSubscription {

    private unsubscribers: Unsubscribe[] = [];

    public add(unsubscribe: Unsubscribe) {
        this.unsubscribers.push(unsubscribe);
    }

    public unsubscribe() {
        this.unsubscribers.forEach(fn => fn());
        this.unsubscribers = [];
    }

}