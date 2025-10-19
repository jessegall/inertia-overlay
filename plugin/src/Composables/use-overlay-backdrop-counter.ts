import { onBeforeMount, onBeforeUnmount, Ref, ref, watch } from "vue";

const top = ref(0);
const blurCount = ref(0);
const instanceCount = ref(0);

export function useOverlayBackdropCounter(blur: Ref<boolean>) {

    const index = ref(instanceCount.value);
    const previousTop = ref(0);
    
    function onBlurOn() {
        previousTop.value = top.value;
        top.value = index.value;

        blurCount.value++;
        if (blurCount.value === 1) {
            document.body.style.overflow = 'hidden';
        }
    }

    function onBlurOff() {
        top.value = previousTop.value;
        blurCount.value--;
        if (blurCount.value === 0) {
            document.body.style.overflow = '';
        }
    }

    watch(blur, (isBlurred) => {
        if (isBlurred) {
            onBlurOn();
        } else {
            onBlurOff();
        }
    });

    onBeforeMount(() => {
        instanceCount.value++;
    });

    onBeforeUnmount(() => {
        instanceCount.value--;
        if (blur.value) {
            onBlurOff();
        }
    });

    return {
        index,
        isTop: () => index.value === top.value,
    }

}