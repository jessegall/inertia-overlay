<script setup lang="ts">

import { computed } from "vue";
import { overlaySizeClasses } from "../overlay-size-classes.ts";
import { OverlaySize } from "../Types/inertia-overlay";

interface Props {
    show: boolean;
    size: OverlaySize;
}

// ----------[ Setup ]----------

const props = defineProps<Props>();

// ----------[ Computed ]----------

const sizeClass = computed(() => overlaySizeClasses[props.size]);

</script>

<template>
    <div class="fixed inset-0 overflow-y-auto px-4 sm:px-0 z-50 pointer-events-none">
        <div class="h-full w-full flex justify-end">
            <Transition name="slide-right" appear>
                <div
                    v-show="show"
                    :class="sizeClass"
                    class="bg-white pointer-events-auto shadow-xl w-full transform transition-all"
                >
                    <slot/>
                </div>
            </Transition>
        </div>
    </div>
</template>

<style scoped lang="scss">

.slide-right {
    &-enter-active, &-leave-active {
        transition: transform 150ms ease-in-out, max-width 150ms ease-in-out;
    }

    &-enter-from, &-leave-to {
        transform: translateX(100%);
    }
}

.slide-left {
    &-enter-active, &-leave-active {
        transition: transform 150ms ease-in-out, max-width 150ms ease-in-out;
    }

    &-enter-from {
        transform: translateX(-100%);
    }

    &-leave-to {
        transform: translateX(-100%);
    }
}
</style>