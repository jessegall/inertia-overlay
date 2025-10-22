<script setup lang="ts">

import Button from "@/components/Button.vue";
import { useOverlay } from "@jessegall/inertia-overlay";

const { createOverlay } = useOverlay();

function createDemoModal() {
    const overlay = createOverlay({
        type: 'demo.modal',
        args: {}
    })

    overlay.open();

    console.log(overlay);
}

</script>

<template>
    <div class="h-screen max-w-7xl mx-auto p-4">
        <div class="flex items-center justify-center h-full">
            <Button @click="createDemoModal">
                Open Demo Modal
            </Button>
        </div>
    </div>
</template>

<style scoped>

</style>