import { OverlayOptions } from '../Types/inertia-overlay';

export declare function useOverlayContext(id: string): {
    options: import('vue').ComputedRef<OverlayOptions>;
    props: import('vue').ComputedRef<Record<string, any>>;
    isContextActive: () => boolean;
};
