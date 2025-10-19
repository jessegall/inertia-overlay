import { OverlayHandle } from '../Types/inertia-overlay';

type UseOverlayOptions = Record<string, string> & {
    autoOpen?: boolean;
};
export declare function useOverlay(id: string, options?: UseOverlayOptions): OverlayHandle;
export declare function useOverlay(type: string, args: Record<string, any>, options?: UseOverlayOptions): OverlayHandle;
export {};
