import { Deferred } from "@inertiajs/vue3";
import { OverlayStack } from "./OverlayStack.ts";

interface DeferredComponent {
    $parent?: DeferredComponent;
    $?: { parent?: DeferredComponent };
    $el?: HTMLElement;
    el?: HTMLElement;
    parent?: DeferredComponent;
    data: Record<string, string>;
}

interface RenderResult {
    children?: unknown[];
}

interface Cache {
    resolved: Map<string | null, RenderResult>;
    counts: Map<string | null, number>;
}

export function initDeferredComponent(stack: OverlayStack): void {
    const original = Deferred.render;
    const resolvedCache = new WeakMap<DeferredComponent, Map<string | null, RenderResult>>();
    const initialChildrenCount = new WeakMap<DeferredComponent, Map<string | null, number>>();
    const componentOverlayId = new WeakMap<DeferredComponent, string | null>();

    Deferred.render = function (this: DeferredComponent, ...args: unknown[]) {
        try {
            const overlayId = getOverlayId(this, stack);

            if (!componentOverlayId.has(this)) {
                componentOverlayId.set(this, overlayId);
            }

            const storedOverlayId = componentOverlayId.get(this)!;
            const cache = getOrCreateCache(this, resolvedCache, initialChildrenCount);

            if (storedOverlayId !== overlayId) {
                const cached = cache.resolved.get(storedOverlayId);
                if (cached) return cached;
            }

            if (cache.resolved.has(storedOverlayId)) {
                return cache.resolved.get(storedOverlayId)!;
            }

            modifyDataForOverlay(this, stack, cache.counts, storedOverlayId);

            const result = original.call(this, ...args) as RenderResult;
            const childrenCount = Array.isArray(result.children) ? result.children.length : 0;

            if (!cache.counts.has(storedOverlayId)) {
                cache.counts.set(storedOverlayId, childrenCount);
            } else if (childrenCount !== cache.counts.get(storedOverlayId)) {
                cache.resolved.set(storedOverlayId, result);
            }

            return result;
        } catch (error) {
            console.error('Error in Deferred.render override:', error);
            return original.call(this, ...args);
        }
    };
}

function getOverlayId(component: DeferredComponent, stack: OverlayStack): string | null {
    let parent = component.$parent ?? component.$?.parent;

    while (parent) {
        const el = parent.$el ?? parent.el;
        if (el?.id === 'overlay-root' || el?.closest?.('#overlay-root')) {
            return stack.peek()?.instanceId ?? null;
        }
        parent = parent.$parent ?? parent.parent;
    }

    return null;
}

function getOrCreateCache(
    component: DeferredComponent,
    resolvedCache: WeakMap<DeferredComponent, Map<string | null, RenderResult>>,
    initialChildrenCount: WeakMap<DeferredComponent, Map<string | null, number>>
): Cache {
    if (!resolvedCache.has(component)) {
        resolvedCache.set(component, new Map());
        initialChildrenCount.set(component, new Map());
    }

    return {
        resolved: resolvedCache.get(component)!,
        counts: initialChildrenCount.get(component)!
    };
}

function modifyDataForOverlay(
    component: DeferredComponent,
    stack: OverlayStack,
    counts: Map<string | null, number>,
    overlayId: string | null
): void {
    if (!overlayId || counts.has(overlayId)) return;

    const overlay = stack.peek();
    if (!overlay) return;

    for (const key in component.data) {
        if (!component.data[key].includes(overlay.instanceId)) {
            component.data[key] = overlay.scopedKey(component.data[key]);
        }
    }
}