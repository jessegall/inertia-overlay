import { OverlayPage } from "./Overlay.ts";

export class OverlayCache {
    private cache = new Map<string, OverlayPage>();

    get(id: string): OverlayPage | undefined {
        return this.cache.get(id);
    }

    set(id: string, page: OverlayPage): void {
        this.cache.set(id, page);
    }

    has(id: string): boolean {
        return this.cache.has(id);
    }

}