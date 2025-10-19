import { Ref } from 'vue';

export declare function useOverlayBackdropCounter(blur: Ref<boolean>): {
    index: Ref<number, number>;
    isTop: () => boolean;
};
