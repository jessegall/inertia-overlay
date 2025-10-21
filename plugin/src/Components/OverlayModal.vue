<script setup lang="ts">
import { computed } from "vue";
import { overlaySizeClasses } from "../overlay-size-classes.ts";
import { OverlaySize } from "../inertia-overlay";

interface Props {
    show: boolean;
    size: OverlaySize
}

const props = defineProps<Props>();
const sizeClass = computed(() => overlaySizeClasses[props.size]);
</script>

<template>
    <div class="inertia-overlay-modal-container">
        <Transition
            enter-active-class="inertia-overlay-modal-enter-active"
            enter-from-class="inertia-overlay-modal-enter-from"
            enter-to-class="inertia-overlay-modal-enter-to"
            leave-active-class="inertia-overlay-modal-leave-active"
            leave-from-class="inertia-overlay-modal-leave-from"
            leave-to-class="inertia-overlay-modal-leave-to"
            appear
        >
            <div
                v-show="show"
                :class="sizeClass"
                class="inertia-overlay-modal"
            >
                <slot/>
            </div>
        </Transition>
    </div>
</template>