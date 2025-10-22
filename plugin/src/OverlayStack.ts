import { shallowRef } from "vue";
import { EventDispatcher } from "./event.ts";
import { ReadonlyOverlay } from "./OverlayFactory.ts";

export class OverlayStack {

    // ----------[ Events ]----------

    public readonly onOverlayPushed = new EventDispatcher<ReadonlyOverlay>();

    // ----------[ Properties ]----------

    public overlays = shallowRef<ReadonlyOverlay[]>([]);

    // ----------[ Methods ]----------

    public push(overlay: ReadonlyOverlay): void {
        this.overlays.value = [...this.overlays.value, overlay];
        this.onOverlayPushed.trigger(overlay);
    }

    public remove(id: string): void {
        this.overlays.value = this.overlays.value.filter(overlay => overlay.id !== id);
    }

    public peek(): ReadonlyOverlay | null {
        const size = this.size();
        if (size === 0) {
            return null;
        }
        return this.overlays.value[size - 1];
    }

    public peekId(): string | null {
        const top = this.peek();
        return top ? top.id : null;
    }

    public size(): number {
        return this.overlays.value.length;
    }

    public findById(id: string): ReadonlyOverlay | null {
        return this.overlays.value.find(overlay => overlay.id === id) || null;
    }

}