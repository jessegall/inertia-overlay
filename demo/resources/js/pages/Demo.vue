<script setup lang="ts">

import Button from "@/components/Button.vue";
import { useOverlay } from "@jessegall/inertia-overlay";
import { Deferred, router } from "@inertiajs/vue3";

const { createOverlay } = useOverlay();

interface Props {
    test?: string;
}

const props = defineProps<Props>();

function createDemoModal() {
    const overlay = createOverlay({
        type: 'demo.modal',
        args: {}
    })

    overlay.open();
}

function goToDemoOtherPage() {
    router.visit('/demo-other-page');
}

function openDemoDrawer() {
    router.visit('/overlay');
}

</script>

<template>
    <div class="h-screen max-w-7xl mx-auto p-4">
        <div class="flex items-center justify-center h-full gap-6">
            <Button @click="createDemoModal">
                Open Demo Modal
            </Button>
            <Button @click="goToDemoOtherPage">
                Go to Demo Other Page
            </Button>
            <Button @click="openDemoDrawer">
                Open overlay by navigating
            </Button>
        </div>
        <Deferred :data="['test']">
            <template #fallback>
                <div class="fixed bottom-4 right-4 bg-white border border-gray-300 rounded shadow p-4">
                    Loading deferred content...
                </div>
            </template>
            <div>
                <div class="fixed bottom-4 right-4 bg-white border border-gray-300 rounded shadow p-4">
                    Deferred content loaded!
                    {{ test }}
                </div>
            </div>
        </Deferred>
    </div>
</template>

<style scoped>

</style>