<script setup lang="ts">

import { computed, defineAsyncComponent, onBeforeMount, shallowRef } from "vue";
import OverlayModalWrapper from "@/OverlaysV2/Components/OverlayModalWrapper.vue";
import OverlayPanelWrapper from "@/OverlaysV2/Components/OverlayPanelWrapper.vue";
import { useOverlay } from "@/OverlaysV2/Composables/use-overlay";
import { OVERLAY_COMPONENTS } from "@/Overlays/overlay-components";

interface Props {
    id: string;
}

interface Emits {
    (e: 'close'): void,
}

const OVERLAY_WRAPPER_COMPONENTS = {
    modal: OverlayModalWrapper,
    panel: OverlayPanelWrapper,
}

// ----------[ Setup ]----------

const { id } = defineProps<Props>();
const emit = defineEmits<Emits>();

const overlay = useOverlay(id);

const wrapper = shallowRef();
const component = shallowRef();

//----------[ Computed ]----------

const active = computed(() => ['open', 'closing'].includes(overlay.state.status));
const open = computed(() => overlay.state.status === 'open');

// ----------[ Methods ]----------

function close() {
    overlay.close();
    emit('close');
}

// ----------[ Lifecycle ]----------

onBeforeMount(() => {

    overlay.onStatusChange.listen((status) => {
        switch (status) {
            case 'open':
                wrapper.value = OVERLAY_WRAPPER_COMPONENTS[overlay.options.variant];
                component.value = defineAsyncComponent(OVERLAY_COMPONENTS[overlay.options.type]);
                break;
        }
    });

})

</script>

<template>
    <template v-if="active">
        <Component :is="wrapper" :show="open" :size="overlay.options.size">
            <Component :is="component" v-bind="overlay.props" @close="close"/>
        </Component>
    </template>
</template>

<style scoped>

</style>