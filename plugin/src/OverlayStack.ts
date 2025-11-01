import { ref } from "vue";
import { EventEmitter } from "./event.ts";
import { ReactiveOverlay } from "./OverlayFactory.ts";
import { OverlayResolver } from "./OverlayPlugin.ts";

export class OverlayStack {

    // ----------[ Events ]----------

    public readonly onOverlayPushed = new EventEmitter<ReactiveOverlay>();
    public readonly onOverlayRemoved = new EventEmitter<ReactiveOverlay>();

    // ----------[ Properties ]----------

    public stack = ref<string[]>([]);

    constructor(
        private readonly overlayResolver: OverlayResolver,
    ) {}

    // ----------[ Methods ]----------

    public push(overlayId: string): void {
        this.stack.value = [...this.stack.value, overlayId];
        this.onOverlayPushed.emit(this.overlayResolver(overlayId));
    }

    public remove(overlayId: string): void {
        this.stack.value = this.stack.value.filter(id => id !== overlayId);
        this.onOverlayRemoved.emit(this.overlayResolver(overlayId));
    }

    public peek(): ReactiveOverlay | null {
        const size = this.size();
        if (size === 0) return null;
        const overlayId = this.stack.value[size - 1];
        return this.overlayResolver(overlayId);
    }

    public size(): number {
        return this.stack.value.length;
    }

    // ----------[ Accessors ]----------

    public get items(): ReactiveOverlay[] {
        return this.stack.value.map(id => this.overlayResolver(id));
    }

    // ----------[ Iterator ]----------

    * [Symbol.iterator](): Iterator<ReactiveOverlay> {
        for (const item of this.items) {
            yield item;
        }
    }

}