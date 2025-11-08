<script setup lang="ts">

import { Component, computed, defineAsyncComponent, inject, nextTick, ref, watch } from "vue";
import OverlayBackdrop from "./OverlayBackdrop.vue";
import { ReactiveOverlay } from "../OverlayFactory.ts";
import OverlayWrapper from "./OverlayWrapper.vue";
import { OverlayStatus } from "../Overlay.ts";
import { OverlayPlugin } from "../OverlayPlugin.ts";

interface Props {
    overlay: ReactiveOverlay
}

// ----------[ Setup ]----------

const props = defineProps<Props>();
const plugin = inject<OverlayPlugin>("overlay.plugin");
const overlay = props.overlay;

// ----------[ Data ]----------

const shouldRenderComponent = ref(false);
const shouldRenderBackdrop = ref(false);

const component = computed(() => {
    console.log("Resolving component for overlay:", overlay.id, overlay.component);

    if (overlay.component) {
        return defineAsyncComponent(plugin!.resolveComponent(overlay.component));
    }

    return null;
})

// ----------[ Event Handlers ]----------

function handleState(state: OverlayStatus) {

    switch (state) {

        case 'open':
            shouldRenderBackdrop.value = true;
            shouldRenderComponent.value = true;
            break;

        case 'closed':
            shouldRenderBackdrop.value = false;
            shouldRenderComponent.value = false;
            break;

    }
}

// ----------[ Watchers ]----------

watch(() => overlay.status, (state) => nextTick(() => handleState(state)), { immediate: true });

</script>

<template>
    <div class="overlay-renderer">

        <OverlayBackdrop
            :blur="shouldRenderBackdrop"
            @click="overlay.close"
        />

        <template v-if="component">

            <OverlayWrapper
                :show="shouldRenderComponent"
                :variant="overlay.variant"
                :size="overlay.size"
            >
                <Component
                    v-if="component"
                    :is="component"
                    v-bind="overlay.props"
                    :key="overlay.id"
                    @close="overlay.close"
                />
            </OverlayWrapper>

        </template>

    </div>
</template>

<style scoped>

</style>