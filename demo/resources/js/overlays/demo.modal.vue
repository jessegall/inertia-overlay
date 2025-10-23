<script setup lang="ts">

import Button from "@/components/Button.vue";
import { router } from "@inertiajs/vue3";
import { useOverlay } from "@jessegall/inertia-overlay";

const props = defineProps<{
    prop: string;
    closureProp: string;
    lazyProp?: string;
    someValue?: string;
}>();

const emit = defineEmits(['close']);

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

function submit() {
    router.post('/submit',
        {
            prop: props.prop,
            closureProp: props.closureProp,
            lazyProp: props.lazyProp,
        },
        {
            onSuccess: () => {
                emit('close');
            }
        }
    );
}

function submitError() {
    router.post('/submit-error',
        {
            prop: props.prop,
            closureProp: props.closureProp,
            lazyProp: props.lazyProp,
        },
        {
            onSuccess: () => {
                emit('close');
            }
        }
    );
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
            <div>
                {{ someValue }}
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
        <div class="flex gap-2">
            <Button @click="submit">
                Submit
            </Button>
            <Button @click="submitError">
                Submit With Error
            </Button>
        </div>
    </div>
</template>

<style scoped>

</style>