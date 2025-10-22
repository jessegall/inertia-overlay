export interface EventListener<T> {
    callback: (payload: T) => void;
    priority: number | (() => number);
}

export interface EventListenerHandle<T> {
    stop: VoidFunction;
}

export class EventDispatcher<T> {

    private listeners: Map<number, EventListener<T>> = new Map();

    public listen(listener: ((payload: T) => void) | EventListener<T>): EventListenerHandle<T> {
        const listenerId = Date.now() + Math.random();
        this.listeners.set(listenerId, this.createListener(listener));

        return {
            stop: () => this.remove(listenerId),
        }
    }

    public remove(listenerId: number) {
        this.listeners.delete(listenerId);
    }

    public trigger(payload: T) {
        const callbacks = Array.from(this.listeners.values())
            .sort((a, b) => this.resolvePriority(b) - this.resolvePriority(a))
            .map(l => l.callback);

        for (const callback of callbacks) {
            callback(payload);
        }
    }

    private createListener(listener: ((payload: T) => void) | EventListener<T>): EventListener<T> {
        if (typeof listener === 'function') {
            return {
                callback: listener,
                priority: 0,
            };
        }

        return listener;
    }

    private resolvePriority(listener: EventListener<T>): number {
        return typeof listener.priority === 'function' ? listener.priority() : listener.priority;
    }

}