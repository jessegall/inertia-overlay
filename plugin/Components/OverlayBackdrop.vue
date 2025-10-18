<script setup lang="ts">
import { useOverlayBackdropCounter } from "../Composables/use-overlay-backdrop-counter";
import { ref } from "vue";

interface Props {
    blur?: boolean;
    minDuration?: number;
}

const props = withDefaults(defineProps<Props>(), {
    blur: false,
    minDuration: 250,
});

const blur = ref(props.blur);
const { isTop } = useOverlayBackdropCounter(blur);

</script>

<template>
    <div
        class="backdrop-blur-component fixed inset-0 flex justify-center items-center bg-black bg-opacity-20 backdrop-blur-sm transition-opacity opacity-0 pointer-events-none"
        :class="{ 'opacity-100 pointer-events-auto': blur && isTop() }"
    />
</template>