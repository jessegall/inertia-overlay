<script setup lang="ts">
import { computed } from "vue";
import { OverlaySize, OverlayVariant } from "../Overlay.ts";
import { overlaySizeClasses } from "../overlay-size-classes.ts";

interface Props {
    variant: OverlayVariant;
    size: OverlaySize;
    show: boolean;
}

const props = defineProps<Props>();

const sizeClass = computed(() => overlaySizeClasses[props.size]);

</script>

<template>

    <template v-if="variant === 'modal'">

        <div class="inertia-overlay-modal-container">
            <Transition name="inertia-overlay-modal" appear>
                <div v-show="show" class="inertia-overlay-modal" :class="sizeClass">
                    <slot/>
                </div>
            </Transition>
        </div>
        
    </template>

    <template v-if="variant === 'drawer'">

        <div class="inertia-overlay-drawer-container">
            <div class="inertia-overlay-drawer-wrapper">
                <Transition name="inertia-overlay-drawer" appear>
                    <div v-show="show" class="inertia-overlay-drawer" :class="sizeClass">
                        <slot/>
                    </div>
                </Transition>
            </div>
        </div>

    </template>

</template>

