<script setup lang="ts">
import { computed } from "vue";
import { overlaySizeClasses } from "../overlay-size-classes.ts";
import { OverlaySize } from "../inertia-overlay";

interface Props {
    show: boolean;
    size: OverlaySize;
}

const props = defineProps<Props>();
const sizeClass = computed(() => overlaySizeClasses[props.size]);
</script>

<template>
    <div class="inertia-overlay-drawer-container">
        <div class="inertia-overlay-drawer-wrapper">
            <Transition name="inertia-overlay-slide-right" appear>
                <div
                    v-show="show"
                    :class="sizeClass"
                    class="inertia-overlay-drawer"
                >
                    <slot/>
                </div>
            </Transition>
        </div>
    </div>
</template>