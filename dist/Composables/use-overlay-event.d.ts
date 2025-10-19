export interface OverlayEventListeners<T> {
    listen: (listener: (payload: T) => void) => VoidFunction;
    remove: (listener: (payload: T) => void) => void;
}
export type OverlayEvent<T> = [
    listeners: OverlayEventListeners<T>,
    trigger: (payload: T) => void
];
export declare function useOverlayEvent<T>(): OverlayEvent<T>;
