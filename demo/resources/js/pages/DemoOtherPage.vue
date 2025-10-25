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
    data: {}
})

function createDemoModal() {
    const overlay = createOverlay({
        type: 'demo.modal',
        data: {}
    })

    overlay.open();
}

function goToDemoPage() {
    router.visit('/');
}

function openDemoDrawer() {
    router.visit('/overlay');
}

function openDemoDrawerLink() {
    router.post('/overlay', {
        _method: 'GET',
        only: ['overlay']
    });
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
            <Button @click="openDemoDrawer">
                Open overlay by navigating
            </Button>
            <Button @click="openDemoDrawerLink">
                Open overlay by navigating Link
            </Button>
        </div>
    </div>
</template>

<style scoped>

</style>