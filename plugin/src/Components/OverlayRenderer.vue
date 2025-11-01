<script setup lang="ts">

import { Component, defineAsyncComponent, inject, nextTick, ref, shallowRef, watch } from "vue";
import OverlayBackdrop from "./OverlayBackdrop.vue";
import { ReactiveOverlay } from "../OverlayFactory.ts";
import OverlayWrapper from "./OverlayWrapper.vue";
import { OverlayState } from "../Overlay.ts";
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

const component = shallowRef<Component>(null);

// ----------[ Event Handlers ]----------

function handleState(state: OverlayState) {

    switch (state) {

        case 'opening':
            shouldRenderBackdrop.value = true;
            component.value = defineAsyncComponent(plugin.resolveComponent(overlay.component))
            break;

        case 'open':
            shouldRenderBackdrop.value = true;
            shouldRenderComponent.value = true;
            break;

        case 'closing':
            shouldRenderComponent.value = false;
            break;

        case 'closed':
            shouldRenderBackdrop.value = false;
            break;

    }
}

// ----------[ Watchers ]----------

watch(() => overlay.state, (state) => nextTick(() => handleState(state)), { immediate: true });

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
                :variant="overlay.config.variant"
                :size="overlay.config.size"
            >
                <Component
                    :is="component"
                    :key="overlay.id"
                    v-bind="overlay.props"
                    @close="overlay.close"
                />
            </OverlayWrapper>

        </template>

    </div>
</template>

<style scoped>

</style>