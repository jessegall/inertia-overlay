<script setup lang="ts">

import { useOverlayRegistrar } from "../Composables/use-overlay-registrar.ts";
import OverlayBackdrop from "./OverlayBackdrop.vue";
import Overlay from "./Overlay.vue";
import { useOverlayInstance } from "../Composables/use-overlay.ts";
import { computed } from "vue";

// ----------[ Data ]----------

const { stack } = useOverlayRegistrar();

// ----------[ Computed ]----------

const showFallBackBackdrop = computed(() => {
    return stack.value.length === 1
        && useOverlayInstance(stack.value[0]).hasStatus('closing');
});

// ----------[ Methods ]----------

function closeOverlay(overlayId: string) {
    useOverlayInstance(overlayId)?.close();
}

function shouldBlurBackground(overlayId: string): boolean {
    if (stack.value.length === 1) {
        return overlayId == stack.value[stack.value.length - 1]
            && useOverlayInstance(overlayId).hasStatus('opening', 'open')
    }

    const secondLastOverlayId = stack.value[stack.value.length - 2];
    if (secondLastOverlayId === overlayId) {
        return useOverlayInstance(stack.value[stack.value.length - 1]).hasStatus('opening', 'closing');
    }

    if (overlayId === stack.value[stack.value.length - 1]) {
        return useOverlayInstance(overlayId).hasStatus('open');
    }

    return false;
}

</script>

<template>
    <Teleport to="body">
        <div class="inertia-overlay">
            <OverlayBackdrop :blur="showFallBackBackdrop"/>
            <template v-for="overlayId in stack" :key="overlayId">
                <OverlayBackdrop
                    :blur="shouldBlurBackground(overlayId)"
                    @click="closeOverlay(overlayId)"
                />
                <Overlay :id="overlayId"/>
            </template>
        </div>
    </Teleport>
</template>

<style scoped>

</style>