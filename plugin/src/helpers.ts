import { Page } from "@inertiajs/core";
import { OverlayPage } from "./Overlay.ts";
import { Reactive, reactive, shallowReadonly, toRaw } from 'vue';

export function clone(value: any): any {
    if (value === null || value === undefined) {
        return null;
    }

    return JSON.parse(JSON.stringify(value));
}

export function isOverlayPage(page: Page): page is OverlayPage {
    return (page as OverlayPage).overlay !== undefined;
}

export function randomString(length: number = 8) {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length }, () =>
        characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
}

export function toReadonly<T extends object>(obj: T): Readonly<Reactive<T>> {
    return shallowReadonly(reactive(bindMethods(obj))) as Readonly<Reactive<T>>;
}

export function bindMethods<T extends object>(obj: T): T {
    const prototype = Object.getPrototypeOf(obj);
    const methodNames = Object.getOwnPropertyNames(prototype)
        .filter(name => name !== 'constructor' && typeof obj[name] === 'function');

    methodNames.forEach(name => {
        obj[name] = obj[name].bind(obj);
    });

    return obj;
}

export function deepToRaw(obj: any): any {
    const raw = toRaw(obj)

    if (Array.isArray(raw)) {
        return raw.map(deepToRaw)
    }

    if (raw !== null && typeof raw === 'object') {
        return Object.keys(raw).reduce((acc, key) => {
            acc[key] = deepToRaw(raw[key])
            return acc
        }, {})
    }

    return raw
}