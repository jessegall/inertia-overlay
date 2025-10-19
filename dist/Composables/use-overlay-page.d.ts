import { OverlayOptions } from '../Types/inertia-overlay';

export type OverlayPage = ReturnType<typeof makeOverlayPage>;
declare function makeOverlayPage(): {
    options: import('vue').Ref<{
        id: string;
        type: string;
        size: string;
        props: string[];
        variant: import('..').OverlayVariant;
    }, OverlayOptions | {
        id: string;
        type: string;
        size: string;
        props: string[];
        variant: import('..').OverlayVariant;
    }>;
    overlayQueryParam: () => string;
    setOptions: (next: OverlayOptions) => void;
};
export declare function useOverlayPage(): OverlayPage;
export {};
