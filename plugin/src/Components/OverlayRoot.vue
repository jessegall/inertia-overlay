<script setup lang="ts">

import { useOverlayRegistrar } from "../Composables/use-overlay-registrar.ts";
import OverlayStack from "./OverlayStack.vue";

// ----------[ Data ]----------

const { stack } = useOverlayRegistrar();

</script>

<template>
    <Teleport to="body">
        <div class="inertia-overlay">
            <template v-if="stack.length > 0">
                <OverlayStack :stack="[...stack]"/>
            </template>
        </div>
    </Teleport>
</template>

<style scoped>

</style>