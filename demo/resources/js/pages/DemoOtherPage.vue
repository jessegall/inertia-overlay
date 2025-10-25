<script setup lang="ts">

import Button from "@/components/Button.vue";
import { useOverlay } from "@jessegall/inertia-overlay";
import { router } from "@inertiajs/vue3";
import { watch } from "vue";

const { createOverlay } = useOverlay();

interface Props {
    test?: string;
}

const props = defineProps<Props>();

const instance = createOverlay({
    type: 'demo.modal',
    args: {}
})

function createDemoModal() {
    const overlay = createOverlay({
        type: 'demo.modal',
        args: {}
    })

    overlay.open();
}

function goToDemoPage() {
    router.visit('/');
}

watch(() => instance.id, (id) => {
    console.log(id);
}, { deep: true });

</script>

<template>
    <div class="h-screen max-w-7xl mx-auto p-4">
        <div class="flex items-center justify-center h-full gap-20">
            <Button @click="createDemoModal">
                Open Demo Modal
            </Button>
            <Button @click="instance.open">
                Open instance
            </Button>
            <Button @click="goToDemoPage">
                Go to Demo Page
            </Button>
        </div>
    </div>
</template>

<style scoped>

</style>