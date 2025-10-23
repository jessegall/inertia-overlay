import { randomString } from "./helpers.ts";

export interface Listener<T = any> {
    handler: (payload: T) => void;
    priority?: number | (() => number);
    subscription?: EventSubscription;
}

export interface Unsubscribe {
    (): void;
}

export type ListenerInput<T = any> = ((payload: T) => void) | Listener<T>;

export class EventEmitter<T = any> {

    private listeners: Map<string, Listener<T>> = new Map();

    public on(listener: ListenerInput<T>): Unsubscribe {
        listener = this.createListener(listener);

        const listenerId = randomString();
        this.listeners.set(listenerId, listener);

        const unsubscribe = () => this.unsubscribe(listenerId);

        if (listener.subscription) {
            listener.subscription.add(unsubscribe);
        }

        return unsubscribe;
    }

    public unsubscribe(listenerId: string) {
        this.listeners.delete(listenerId);
    }

    public emit(payload: T) {
        const callbacks = Array.from(this.listeners.values())
            .sort((a, b) => this.resolvePriority(b) - this.resolvePriority(a))
            .map(l => l.handler);

        for (const callback of callbacks) {
            callback(payload);
        }
    }

    private createListener(listener: ListenerInput<T>): Listener<T> {
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