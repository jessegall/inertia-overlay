import { Deferred } from "@inertiajs/vue3";
import { OverlayStack } from "./OverlayStack.ts";
import { ComponentInstance } from "vue";

export function extendDeferredComponent(stack: OverlayStack): void {
    const scopes = new WeakMap<ComponentInstance<any>, string>();

    Deferred.render = function () {
        if (! this.$slots.fallback) {
            throw new Error("`<Deferred>` requires a `<template #fallback>` slot");
        }

        function resolveKeys(data: string | string[], scope: string | null): string[] {
            const keys = Array.isArray(data) ? data : [data];
            if (scope) {
                return keys.map((key) => `${ scope }:${ key }`);
            }
            return keys;
        }

        if (! scopes.has(this) && isInOverlayContext(this)) {
            const overlay = stack.peek();
            if (overlay) {
                scopes.set(this, overlay.instanceId);
            }
        }

        const scope = scopes.get(this);
        const keys = resolveKeys(this.$props.data, scope);

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