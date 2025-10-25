<script setup lang="ts">

import { useOverlayStack } from "../Composables/useOverlayStack.ts";
import OverlayRenderer from "./OverlayRenderer.vue";

// ----------[ Setup ]----------

const stack = useOverlayStack();


</script>

<template>
    <Teleport to="body">
        <div id="overlay-root">
            <template v-for="overlay in stack" :key="overlay.id">
                <OverlayRenderer :overlay/>
            </template>
        </div>
    </Teleport>
</template>

<style scoped>

</style>