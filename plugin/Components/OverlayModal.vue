<script setup lang="ts">

import { computed } from "vue";
import { OverlaySize } from "../inertia-overlay";
import { overlaySizeClasses } from "../overlay-size-classes";

interface Props {
    show: boolean;
    size: OverlaySize
}

const props = defineProps<Props>();

const sizeClass = computed(() => overlaySizeClasses[props.size]);

</script>

<template>
    <div class="fixed inset-0 overflow-y-auto px-4 py-6 sm:px-0 z-50 pointer-events-none">
        <Transition
            enter-active-class="ease-out duration-150"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            appear
        >
            <div
                v-show="show"
                :class="sizeClass"
                class="mb-6 bg-white rounded-lg shadow-xl transform transition-all sm:w-full sm:mx-auto pointer-events-auto overflow-hidden"
            >
                <slot/>
            </div>
        </Transition>
    </div>
</template>

<style scoped>

</style>