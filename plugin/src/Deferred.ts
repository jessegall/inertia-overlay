import { Deferred } from "@inertiajs/vue3";
import { OverlayStack } from "./OverlayStack.ts";
import { ComponentInstance } from "vue";

export function extendDeferredComponent(stack: OverlayStack): void {
    const overlayContextCache = new WeakMap<ComponentInstance<any>, string[]>();

    Deferred.render = function () {
        if (! this.$slots.fallback) {
            throw new Error("`<Deferred>` requires a `<template #fallback>` slot");
        }

        function resolveKeys(data: string | string[]): string[] {
            return Array.isArray(data) ? data : [data];
        }

        let keys = overlayContextCache.get(this);

        if (! keys) {
            const overlay = stack.peek();

            if (overlay && isInOverlayContext(this)) {
                keys = resolveKeys(this.$props.data).map(key => overlay.scopedKey(key));
            } else {
                keys = resolveKeys(this.$props.data);
            }

            if (keys.every((key) => this.$page.props[key] !== undefined)) {
                overlayContextCache.set(this, keys);
            }
        }

        return keys.every((key) => this.$page.props[key] !== undefined)
            ? this.$slots.default?.()
            : this.$slots.fallback();
    }
}

function isInOverlayContext(component: ComponentInstance<any>): boolean {
    let parent = component.$parent ?? component.$?.parent;

    while (parent) {
        const el = parent.$el ?? parent.el;
        if (el?.closest?.('#overlay-root')) {
            return true;
        }
        parent = parent.$parent ?? parent.parent;
    }

    return false;
}