<script setup lang="ts">

import Button from "@/components/Button.vue";
import { router } from "@inertiajs/vue3";
import { useOverlay } from "@jessegall/inertia-overlay";

const props = defineProps<{
    prop: string;
    closureProp: string;
    lazyProp?: string;
}>();

const { createOverlay } = useOverlay();

function loadLazyProp() {
    router.reload({
        only: ['lazyProp']
    })
}

function openDemoModal() {
    const overlay = createOverlay({
        type: 'demo.modal',
        args: {},
    })

    overlay.open();
}

function openDemoDrawer() {
    const overlay = createOverlay({
        type: 'demo.drawer',
        args: {},
    })

    overlay.open();
}


</script>

<template>
    <div class="p-6 flex flex-col gap-4">
        <div>
            <div>
                {{ prop }}
            </div>
            <div>
                {{ closureProp }}
            </div>
            <div>
                {{ lazyProp }}
            </div>
        </div>
        <div class="flex gap-2">
            <Button @click="loadLazyProp">
                Load lazy props
            </Button>
            <Button @click="openDemoModal">
                Open Another Demo Modal
            </Button>
            <Button @click="openDemoDrawer">
                Open Demo Drawer
            </Button>
        </div>
    </div>
</template>

<style scoped>

</style>