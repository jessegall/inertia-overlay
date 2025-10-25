<script setup lang="ts">

import { Component, defineAsyncComponent, inject, ref, shallowRef, watch } from "vue";
import OverlayBackdrop from "./OverlayBackdrop.vue";
import { ReadonlyOverlay } from "../OverlayFactory.ts";
import OverlayWrapper from "./OverlayWrapper.vue";
import { OverlayState } from "../Overlay.ts";
import { OverlayPlugin } from "../OverlayPlugin.ts";

interface Props {
    overlay: ReadonlyOverlay
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
            break;

        case 'open':
            shouldRenderBackdrop.value = true;
            shouldRenderComponent.value = true;
            console.log(overlay.config);
            component.value = defineAsyncComponent(plugin.options.resolve(overlay.config.component))
            break;

        case 'closing':
            shouldRenderComponent.value = false;
            shouldRenderBackdrop.value = false;
            break;

    }
}

// ----------[ Watchers ]----------

watch(() => overlay.state, handleState, { immediate: true });

</script>

<template>
    <div class="overlay-renderer">

        <OverlayBackdrop
            :blur="shouldRenderBackdrop"
            @click="overlay.close"
        />

        <template v-if="overlay.config">

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