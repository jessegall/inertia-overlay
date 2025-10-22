import { Page } from "@inertiajs/core";
import { OverlayPage } from "./Overlay.ts";
import { Reactive, reactive, shallowReadonly } from 'vue';

export function clone(value: any): any {
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