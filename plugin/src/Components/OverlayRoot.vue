<script setup lang="ts">

import { useOverlayStack } from "../Composables/useOverlayStack.ts";
import OverlayRenderer from "./OverlayRenderer.vue";
import { onBeforeMount, ref } from "vue";
import { ReadonlyOverlay } from "../OverlayFactory.ts";

// ----------[ Setup ]----------

const stack = useOverlayStack();

// ----------[ Data ]----------

const overlays = ref<ReadonlyOverlay[]>([]);

// ----------[ Lifecycle ]----------

onBeforeMount(() => {
    stack.onOverlayPushed.listen(overlay => {
        overlays.value.push(overlay);
    });

    stack.onOverlayRemoved.listen(overlay => setTimeout(
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