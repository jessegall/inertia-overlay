<script setup lang="ts">

import { useOverlayStack } from "../Composables/useOverlayStack.ts";
import OverlayRenderer from "./OverlayRenderer.vue";
import { inject, nextTick, onBeforeMount, ref } from "vue";
import { ReactiveOverlay } from "../OverlayFactory.ts";
import { OverlayPlugin } from "../OverlayPlugin.ts";

// ----------[ Setup ]----------

const stack = useOverlayStack();
const plugin = inject<OverlayPlugin>("overlay.plugin");

// ----------[ Data ]----------

const overlays = ref<ReactiveOverlay[]>([]);

// ----------[ Lifecycle ]----------

onBeforeMount(() => {
    stack.onPushed.listen(overlay => {
        nextTick(() => overlays.value.push(overlay))
    });

    stack.onRemoved.listen(overlay => setTimeout(
        () => overlays.value = overlays.value.filter(o => o.id !== overlay.id),
        300
    ));
})

</script>

<template>
    <slot/>
    <Teleport to="body">
        <div id="overlay-root">
            <template v-for="overlay in overlays" :key="overlay.id">
                <OverlayRenderer :overlay/>
            </template>
        </div>
    </Teleport>
</template>

<style scoped>

</style>