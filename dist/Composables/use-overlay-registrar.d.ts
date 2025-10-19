export type OverlayRegistrar = ReturnType<typeof makeOverlayRegister>;
declare function makeOverlayRegister(): {
    register: (id: string) => void;
    unregister: (id: string) => void;
    hasOverlay: (id: string) => boolean;
    hasOverlays: () => boolean;
    size: () => number;
    stack: Readonly<import('vue').Ref<readonly string[], readonly string[]>>;
    activeOverlayId: import('vue').ComputedRef<string>;
};
export declare function useOverlayRegistrar(): OverlayRegistrar;
export {};
