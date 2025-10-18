<script setup lang="ts">
import { computed } from "vue";
import { refLock } from "@/Utils/ref-lock";
import { useOverlayBackdropCounter } from "@/OverlaysV2/Composables/use-overlay-backdrop-counter";

interface Props {
    blur?: boolean;
    minDuration?: number;
}

const props = withDefaults(defineProps<Props>(), {
    blur: false,
    minDuration: 250,
});

const blur = refLock(computed(() => props.blur), {
    duration: props.minDuration,
    condition: value => value,
})

const { isTop } = useOverlayBackdropCounter(blur);

</script>

<template>
    <div
        class="backdrop-blur-component fixed inset-0 flex justify-center items-center bg-black bg-opacity-20 backdrop-blur-sm transition-opacity opacity-0 pointer-events-none"
        :class="{ 'opacity-100 pointer-events-auto': blur && isTop() }"
    />
</template>