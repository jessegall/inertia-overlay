<script setup lang="ts">

import { useOverlay } from "@jessegall/inertia-overlay";
import Button from "@/components/Button.vue";

const overlay = {
    modal: useOverlay('demo.modal')
}

</script>

<template>
    <div class="h-screen max-w-7xl mx-auto p-4">
        <div class="flex items-center justify-center h-full">
            <Button @click="overlay.modal.open()">
                Open Demo Modal
            </Button>
        </div>
    </div>
</template>

<style scoped>

</style>