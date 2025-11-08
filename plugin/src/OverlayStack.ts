import { ref } from "vue";
import { EventEmitter } from "./event.ts";
import { ReactiveOverlay } from "./OverlayFactory.ts";
import { OverlayResolver } from "./OverlayPlugin.ts";

export class OverlayStack {

    // ----------[ Events ]----------

    public readonly onPushed = new EventEmitter<ReactiveOverlay>();
    public readonly onRemoved = new EventEmitter<ReactiveOverlay>();

    // ----------[ Properties ]----------

    public stack = ref<string[]>([]);

    constructor(
        private readonly resolve: OverlayResolver,
    ) {}

    // ----------[ Methods ]----------

    public push(overlayId: string): void {
        const overlay = this.resolve(overlayId);
        const parent = this.peek();

        if (parent) {
            overlay.parentId = parent.id;
            parent.blur();
        }

        overlay.index = this.size();
        overlay.focus();

        this.stack.value = [...this.stack.value, overlayId];
        this.onPushed.emit(overlay);
    }

    public remove(overlayId: string): void {
        const index = this.stack.value.findIndex(id => id === overlayId);
        if (index === -1) return;

        const overlay = this.resolve(overlayId);
        const child = this.items.find(o => o.parentId === overlayId);

        if (child) {
            child.parentId = null;
            this.remove(child.id);
        }

        this.stack.value = this.stack.value.filter(id => id !== overlayId);
        this.onRemoved.emit(overlay);

        if (overlay.parentId) {
            const parent = this.resolve(overlay.parentId);
            parent.focus();
        }
    }

    public get(overlayId: string): ReactiveOverlay {
        if (! this.stack.value.includes(overlayId)) {
            throw new Error(`Failed to resolve overlay. Overlay with ID "${ overlayId }" not found in stack.`);
        }

        return this.resolve(overlayId);
    }

    public peek(): ReactiveOverlay | null {
        const size = this.size();
        if (size === 0) return null;
        const overlayId = this.stack.value[size - 1];
        return this.resolve(overlayId);
    }

    public size(): number {
        return this.stack.value.length;
    }

    // ----------[ Accessors ]----------

    public get items(): ReactiveOverlay[] {
        return this.stack.value.map(id => this.resolve(id));
    }

    // ----------[ Iterator ]----------

    * [Symbol.iterator](): Iterator<ReactiveOverlay> {
        for (const item of this.items) {
            yield item;
        }
    }

}