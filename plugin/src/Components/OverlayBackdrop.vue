<script setup lang="ts">

interface Props {
    blur?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    blur: false,
});

</script>

<template>
    <div
        class="inertia-overlay-backdrop"
        :class="{
            'inertia-overlay-backdrop--active': blur,
        }"
    />
</template>