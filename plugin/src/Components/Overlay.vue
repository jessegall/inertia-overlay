<script setup lang="ts">

import { computed, onMounted, shallowRef } from "vue";
import { useOverlay } from "../Composables/use-overlay.ts";
import OverlayDrawer from "./OverlayDrawer.vue";
import OverlayModal from "./OverlayModal.vue";
import { OverlayVariant } from "../inertia-overlay";
import { useOverlayComponentResolver } from "../Composables/use-overlay-component-resolver.ts";

interface Props {
    id: string;
}

interface Emits {
    (e: 'close'): void,
}

const OVERLAY_VARIANT_COMPONENTS: Record<OverlayVariant, any> = {
    modal: OverlayModal,
    drawer: OverlayDrawer,
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

const { resolve: resolveOverlayComponent } = useOverlayComponentResolver();

function close() {
    overlay.close();
    emit('close');
}

// ----------[ Lifecycle ]----------

onMounted(() => {

    overlay.onStatusChange.listen(async (status) => {
        switch (status) {
            case 'open':
                wrapper.value = OVERLAY_VARIANT_COMPONENTS[overlay.options.variant];
                component.value = await resolveOverlayComponent(overlay.options.typename);
                break;
        }
    });

})

</script>

<template>
    <template v-if="active">
        <Component
            :is="wrapper"
            :show="open"
            :size="overlay.options.size"
        >
            
            <Component
                :is="component"
                v-bind="overlay.props"
                @close="close"
            />

        </Component>
    </template>
</template>

<style scoped>

</style>