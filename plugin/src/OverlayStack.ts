import { Overlay } from "./Overlay.ts";
import { shallowRef } from "vue";
import { EventDispatcher } from "./event.ts";

export class OverlayStack {

    // ----------[ Events ]----------

    public readonly onOverlayPushed = new EventDispatcher<Overlay>();

    // ----------[ Properties ]----------

    public overlays = shallowRef<Overlay[]>([]);

    // ----------[ Methods ]----------

    public push(overlay: Overlay): void {
        this.overlays.value = [...this.overlays.value, overlay];
        this.onOverlayPushed.trigger(overlay);
    }

    public remove(id: string): void {
        this.overlays.value = this.overlays.value.filter(overlay => overlay.id !== id);
    }

    public peek(): Overlay | null {
        const size = this.size();
        if (size === 0) {
            return null;
        }
        return this.overlays.value[size - 1];
    }

    public size(): number {
        return this.overlays.value.length;
    }

    public findById(id: string): Overlay | null {
        return this.overlays.value.find(overlay => overlay.id === id) || null;
    }

}