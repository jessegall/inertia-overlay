<script setup lang="ts">

import { useOverlayStack } from "../Composables/useOverlayStack.ts";
import OverlayRenderer from "./OverlayRenderer.vue";
import { computed, Reactive, reactive, watch } from "vue";
import { Overlay } from "../Overlay.ts";

// ----------[ Setup ]----------

const stack = useOverlayStack();

//----------[ Computed ]----------

const overlays = computed<Reactive<Overlay[]>>(() => {
    return reactive(stack.overlays.value);
});

// ----------[ Methods ]----------

function closeOverlay(id: string) {
    const overlay = stack.findById(id);
    overlay?.close();
}

</script>

<template>
    <Teleport to="body">
        <div class="overlay-root">
            <template v-for="overlay in overlays" :key="overlay.id">
                <OverlayRenderer
                    :id="overlay.id"
                    :type="overlay.type"
                    :args="overlay.args"
                    :state="overlay.state"
                    :props="overlay.props"
                    @close="closeOverlay(overlay.id)"
                />
            </template>
        </div>
    </Teleport>
</template>

<style scoped>

</style>