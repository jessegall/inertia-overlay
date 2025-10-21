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
        class="inertia-overlay-backdrop"
        :class="{ 'inertia-overlay-backdrop--active': blur }"
    />
</template>