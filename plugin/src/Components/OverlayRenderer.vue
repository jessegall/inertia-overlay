<script setup lang="ts">

import { h, ref, watch } from "vue";
import OverlayBackdrop from "./OverlayBackdrop.vue";
import { ReadonlyOverlay } from "../OverlayFactory.ts";
import OverlayWrapper from "./OverlayWrapper.vue";
import { OverlayState } from "../Overlay.ts";

interface Props {
    overlay: ReadonlyOverlay
}

// ----------[ Setup ]----------

const props = defineProps<Props>();
const overlay = props.overlay;

const OverlayComponent = () => h(overlay.component, {
    ...overlay.props,
    onClose() {
        overlay.close();
    }
});

// ----------[ Data ]----------

const shouldRenderComponent = ref(false);
const shouldRenderBackdrop = ref(false);

// ----------[ Event Handlers ]----------

function handleState(state: OverlayState) {
    switch (state) {

        case 'opening':
            shouldRenderBackdrop.value = true;
            break;

        case 'open':
            shouldRenderComponent.value = true;
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
                <OverlayComponent :key="overlay.id"/>
            </OverlayWrapper>

        </template>

    </div>
</template>

<style scoped>

</style>