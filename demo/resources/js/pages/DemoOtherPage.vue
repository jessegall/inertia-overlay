<script setup lang="ts">

import Button from "@/components/Button.vue";
import { router } from "@inertiajs/vue3";

function goToDemoPage() {
    router.visit('/');
}

</script>

<template>
    <div class="h-screen max-w-7xl mx-auto p-4">
        <div class="flex items-center justify-center h-full">
            <Button @click="goToDemoPage">
                Go to Demo Page
            </Button>
        </div>
    </div>
</template>

<style scoped>

</style>