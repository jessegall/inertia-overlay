<script setup lang="ts">

import { useOverlayStack } from "../Composables/useOverlayStack.ts";
import OverlayRenderer from "./OverlayRenderer.vue";
import { computed, Reactive } from "vue";
import { Overlay } from "../Overlay.ts";

// ----------[ Setup ]----------

const stack = useOverlayStack();

//----------[ Computed ]----------

const overlays = computed<Reactive<Overlay[]>>(() => {
    return stack.overlays.value;
});

</script>

<template>
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