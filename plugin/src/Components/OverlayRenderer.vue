<script setup lang="ts">

import { computed, inject, onMounted, shallowRef, watch } from "vue";
import OverlayDrawer from "./OverlayDrawer.vue";
import OverlayModal from "./OverlayModal.vue";
import { OverlayVariant } from "../inertia-overlay";
import { OverlayArgs, OverlayProps, OverlayState, OverlayType } from "../Overlay.ts";
import { OverlayPlugin } from "../OverlayPlugin.ts";
import OverlayBackdrop from "./OverlayBackdrop.vue";

interface Props {
    id: string,
    type: OverlayType,
    args: OverlayArgs;
    state: OverlayState;
    props: OverlayProps;
}

interface Emits {
    (e: 'close'): void,
}

const OVERLAY_VARIANT_COMPONENTS: Record<OverlayVariant, any> = {
    modal: OverlayModal,
    drawer: OverlayDrawer,
}

// ----------[ Setup ]----------

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const plugin = inject("overlay.plugin") as OverlayPlugin;
const wrapper = shallowRef();
const component = shallowRef();

//----------[ Computed ]----------

const active = computed(() => ['open', 'closing'].includes(props.state));
const open = computed(() => props.state === 'open');

// ----------[ Methods ]----------

function close() {
    emit('close');
}

// ----------[ Watchers ]----------

const statusWatcherHandle = watch(
    () => props.state,
    async (status) => {
        if (status === 'open') {
            wrapper.value = OVERLAY_VARIANT_COMPONENTS['modal'];
            component.value = await plugin.resolveComponent(props.type);
            statusWatcherHandle.stop()
            console.log(props);
        }
    },
    {
        immediate: true,
    }
)

onMounted(() => {
    console.log("Overlay mounted:", props);
})

</script>

<template>
    <div class="overlay-renderer">
        <OverlayBackdrop
            :blur="active"
            @click="close"
        />
        <template v-if="active">
            <Component
                :is="wrapper"
                :show="open"
                size="3xl"
            >
                <Component
                    :is="component"
                    v-bind="props.props"
                    @close="close"
                />
            </Component>
        </template>
    </div>
</template>

<style scoped>

</style>