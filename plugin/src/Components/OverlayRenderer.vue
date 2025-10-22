<script setup lang="ts">

import { computed, h, inject, nextTick, ref, watch } from "vue";
import { OverlayPlugin } from "../OverlayPlugin.ts";
import OverlayBackdrop from "./OverlayBackdrop.vue";
import { ReadonlyOverlay } from "../OverlayFactory.ts";
import OverlayWrapperWrapper from "./OverlayWrapper.vue";

interface Props {
    overlay: ReadonlyOverlay
}

// ----------[ Setup ]----------

const plugin = inject<OverlayPlugin>("overlay.plugin");
const props = defineProps<Props>();
const overlay = props.overlay;

const OverlayComponentRenderer = () => h(overlay.component, {
    ...overlay.props,
    onClose() {
        overlay.close();
    }
});

// ----------[ Data ]----------

const shouldRenderComponent = ref(false);

//----------[ Computed ]----------

const shouldRenderBackdrop = computed<boolean>(() => {
    return overlay.state === 'opening'
        || overlay.state === 'open'
        || overlay.state === 'closing';
});

// ----------[ Watchers ]----------

watch(() => overlay.state, (state) => {
    switch (state) {

        case 'open':
            nextTick(() => shouldRenderComponent.value = true);
            break;

        case 'closing':
            shouldRenderComponent.value = false;
            break;

    }
});

</script>

<template>
    <div class="overlay-renderer">

        <OverlayBackdrop
            :blur="shouldRenderBackdrop"
            @click="overlay.close"
        />

        <template v-if="overlay.config">

            <OverlayWrapperWrapper
                :show="shouldRenderComponent"
                :variant="overlay.config.variant"
                :size="overlay.config.size"
            >
                <OverlayComponentRenderer/>
            </OverlayWrapperWrapper>

        </template>

    </div>
</template>

<style scoped>

</style>