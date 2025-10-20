<script setup lang="ts">

import { computed, shallowRef, watch } from "vue";
import { useOverlayInstance } from "../Composables/use-overlay.ts";
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

const overlay = useOverlayInstance(id);
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

// ----------[ Watchers ]----------

const statusWatcherHandle = watch(
    () => overlay.state.status,
    async (status) => {
        if (status === 'open') {
            wrapper.value = OVERLAY_VARIANT_COMPONENTS[overlay.state.config.variant];
            component.value = await resolveOverlayComponent(overlay.state.config.typename);
            statusWatcherHandle.stop()
        }
    },
    {
        immediate: true,
    }
)

</script>

<template>
    <template v-if="active">
        <Component
            :is="wrapper"
            :show="open"
            :size="overlay.state.config.size"
        >

            <Component
                :is="component"
                v-bind="overlay.state.props"
                @close="close"
            />

        </Component>
    </template>
</template>

<style scoped>

</style>