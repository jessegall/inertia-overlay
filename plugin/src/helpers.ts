import { Page } from "@inertiajs/core";
import { OverlayPage } from "./Overlay.ts";

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

export function resolve(value: any): any {
    if (typeof value === 'function') {
        return value();
    }
    return value;
}
