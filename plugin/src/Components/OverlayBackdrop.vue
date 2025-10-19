<script setup lang="ts">
import { computed } from "vue";

interface Props {
    blur?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    blur: false,
});

const blur = computed(() => props.blur);

</script>

<template>
    <div
        class="backdrop-blur-component fixed inset-0 flex justify-center items-center bg-black backdrop-blur-sm transition-opacity opacity-0 pointer-events-none z-50"
        :class="{ 'opacity-20 pointer-events-auto': blur }"
    />
</template>