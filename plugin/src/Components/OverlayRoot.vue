<script setup lang="ts">

import { useOverlayRegistrar } from "../Composables/use-overlay-registrar.ts";
import OverlayBackdrop from "./OverlayBackdrop.vue";
import Overlay from "./Overlay.vue";
import { useOverlay } from "../Composables/use-overlay.ts";

// ----------[ Data ]----------

const { stack } = useOverlayRegistrar();

// ----------[ Methods ]----------

function closeOverlay(overlayId: string) {
    useOverlay(overlayId)?.close();
}

function shouldBlurBackground(overlayId: string): boolean {
    if (stack.value.length === 1) {
        return overlayId == stack.value[stack.value.length - 1]
            && useOverlay(overlayId).hasStatus('opening', 'open')
    }

    const secondLastOverlayId = stack.value[stack.value.length - 2];
    if (secondLastOverlayId === overlayId) {
        return useOverlay(stack.value[stack.value.length - 1]).hasStatus('opening', 'closing');
    }

    if (overlayId === stack.value[stack.value.length - 1]) {
        return useOverlay(overlayId).hasStatus('open');
    }

    return false;
}

</script>

<template>
    <Teleport to="body">
        <div class="inertia-overlay">
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