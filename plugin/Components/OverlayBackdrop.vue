<script setup lang="ts">
import { useOverlayBackdropCounter } from "../Composables/use-overlay-backdrop-counter";
import { computed } from "vue";

interface Props {
    blur?: boolean;
    minDuration?: number;
}

const props = withDefaults(defineProps<Props>(), {
    blur: false,
    minDuration: 250,
});

const blur = computed(() => props.blur);
const { isTop } = useOverlayBackdropCounter(blur);

</script>

<template>
    <div
        class="backdrop-blur-component fixed inset-0 flex justify-center items-center bg-black backdrop-blur-sm transition-opacity opacity-0 pointer-events-none"
        :class="{ 'opacity-20 pointer-events-auto': blur && isTop() }"
    />
</template>