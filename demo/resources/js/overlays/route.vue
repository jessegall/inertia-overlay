<script setup lang="ts">

import Button from "@/components/Button.vue";
import { router } from "@inertiajs/vue3";
import { useOverlay } from "@jessegall/inertia-overlay";

const props = defineProps<{
    prop: string;
    closureProp: string;
    lazyProp?: string;

    message?: string;
}>();

const emit = defineEmits(['close']);

const { createOverlay, overlayAction } = useOverlay();

function loadLazyProp() {
    router.reload({
        only: ['lazyProp']
    })
}

function openDemoModal() {
    const overlay = createOverlay({
        component: 'demo.modal',
        props: {},
    })

    overlay.open();
}

function openDemoDrawer() {
    const overlay = createOverlay({
        component: 'demo.drawer',
        props: {},
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

function testAction() {
    overlayAction('test', {
        props: {
            example: 123,
        }
    });
}

function resizeAction() {
    overlayAction('resize', {
        onSuccess: data => {
            console.log(data);
        }
    });
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
                {{ message }}
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
        <div class="flex gap-2">
            <Button @click="testAction">
                Test action
            </Button>
            <Button @click="resizeAction">
                Resize action
            </Button>
        </div>
    </div>
</template>

<style scoped>

</style>