<script setup lang="ts">

import { useOverlayRegistrar } from "../Composables/use-overlay-registrar";
import OverlayStack from "./OverlayStack.vue";

// ----------[ Data ]----------

const { stack } = useOverlayRegistrar();

</script>

<template>
    <Teleport to="body">
        <template v-if="stack.length > 0">
            <OverlayStack :stack="[...stack]"/>
        </template>
    </Teleport>
</template>

<style scoped>

</style>