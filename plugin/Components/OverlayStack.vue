<script setup lang="ts">

import Overlay from "@/OverlaysV2/Components/Overlay.vue";
import { computed, nextTick, onMounted, ref } from "vue";
import OverlayBackdrop from "@/OverlaysV2/Components/OverlayBackdrop.vue";
import { useOverlay } from "@/OverlaysV2/Composables/use-overlay";

interface Props {
    stack: string[];
}

// ----------[ Setup ]----------

const props = defineProps<Props>();

// ----------[ Data ]----------

const backdropBlurActive = ref(false);

// ----------[ Computed ]----------

const overlayId = computed(() => {
    return props.stack[props.stack.length - 1];
});

const stack = computed(() => {
    return props.stack.slice(1);
});

const overlay = useOverlay(overlayId.value);

// ----------[ Lifecycle ]----------

onMounted(() => nextTick(() => {
    backdropBlurActive.value = true;
    const stop = overlay.onStatusChange.listen(status => {
        if (['closing', 'closed'].includes(status)) {
            backdropBlurActive.value = false;
            stop();
        }
    })
}))

</script>

<template>
    <div class="overlay-stack">

        <OverlayBackdrop
            :blur="backdropBlurActive"
            @click="overlay.close"
        />

        <Overlay :id="overlayId"/>

        <template v-if="stack.length > 0">
            <OverlayStack :stack/>
        </template>

    </div>
</template>

<style scoped lang="scss">
:deep(.backdrop-blur-component ) {
    @apply z-50;
}
</style>