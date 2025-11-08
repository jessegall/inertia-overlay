import { OverlayRouter } from "./OverlayRouter.ts";
import { OverlayStack } from "./OverlayStack.ts";
import { OverlayFactory, ReactiveOverlay } from "./OverlayFactory.ts";
import { OverlayPage } from "./Overlay.ts";
import { nextTick } from "vue";

export class OverlayManager {

    public readonly instances = new Map<string, ReactiveOverlay>();

    constructor(
        private readonly stack: OverlayStack,
        private readonly router: OverlayRouter,
        private readonly factory: OverlayFactory,
    ) {
        this.stack.onRemoved.listen(overlay => overlay.close());
        this.router.onOverlayPageLoad.listen({
            handler: page => nextTick(() => this.handlePageLoad(page)),
            priority: -1,
        });
    }

    public resolve(overlayId: string): ReactiveOverlay {
        const overlay = this.instances.get(overlayId);
        if (! overlay) {
            throw new Error(`Overlay "${ overlayId }" not found`);
        }
        return overlay;
    }

    private handlePageLoad(page: OverlayPage): void {
        this.executeCommands(page);
        this.updateOrCreateOverlay(page);
        this.updateOverlayProps(page);
    }

    private executeCommands(page: OverlayPage): void {
        for (const overlay of this.instances.values()) {
            const commands = page.overlay.__commands[overlay.id];
            if (commands) overlay.handleCommands(commands);
        }
    }

    private updateOrCreateOverlay(page: OverlayPage): void {
        const { id, url } = page.overlay;
        const existing = this.instances.get(id);

        if (existing) {
            existing.url = new URL(url);
        } else {
            const overlay = this.factory.make(page);
            this.instances.set(overlay.id, overlay);
            this.attachLifecycleListeners(overlay);
            overlay.open();
        }
    }

    private updateOverlayProps(page: OverlayPage): void {
        for (const overlay of this.instances.values()) {
            const props = page.props[overlay.id];
            if (props) overlay.updateProps(props);
        }
    }

    private attachLifecycleListeners(overlay: ReactiveOverlay): void {
        overlay.onOpen.listen(() => this.stack.push(overlay.id));
        overlay.onClose.listen(() => {
            this.stack.remove(overlay.id);
            overlay.destroy();
        });
    }

}