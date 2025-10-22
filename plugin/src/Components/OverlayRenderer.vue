<script setup lang="ts">

import { computed, h, inject, nextTick, ref, watch } from "vue";
import { OverlayPlugin } from "../OverlayPlugin.ts";
import OverlayBackdrop from "./OverlayBackdrop.vue";
import { ReadonlyOverlay } from "../OverlayFactory.ts";
import OverlayWrapperWrapper from "./OverlayWrapper.vue";

interface Props {
    overlay: ReadonlyOverlay
}

interface Emits {
    (e: 'close'): void,
}

// ----------[ Setup ]----------

const plugin = inject<OverlayPlugin>("overlay.plugin");
const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const overlay = props.overlay;

const OverlayComponentRenderer = () => h(overlay.component, overlay.props);

// ----------[ Data ]----------

const shouldRenderComponent = ref(false);

//----------[ Computed ]----------

const shouldRenderBackdrop = computed<boolean>(() => {
    return overlay.state === 'opening'
        || overlay.state === 'open'
        || overlay.state === 'closing';
});

// ----------[ Methods ]----------

function close() {
    emit('close');
}

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
            @click="close"
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