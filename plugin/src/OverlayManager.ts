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
            handler: page => nextTick(() => this.handleOverlayPageLoad(page)),
            priority: -1,
        });
    }

    public resolve(overlayId: string): ReactiveOverlay {
        const overlay = this.instances.get(overlayId);

        if (! overlay) {
            throw new Error(`Failed to resolve overlay. Overlay with ID "${ overlayId }" not found.`);
        }

        return overlay;
    }

    public createAndRegisterInstance(page: OverlayPage): ReactiveOverlay {
        const overlay = this.factory.make(page);
        this.instances.set(overlay.id, overlay);
        return overlay;
    }

    // ----------[ Handlers ]----------

    private handleOverlayPageLoad(page: OverlayPage) {
        const overlayId = page.overlay.id;

        if (this.instances.has(overlayId)) {
            this.updateOverlayUrl(overlayId, page);
            this.handleCommands(overlayId, page);
        } else {
            const overlay = this.createAndRegisterInstance(page);
            this.registerOverlayEventListeners(overlay);
            overlay.open();
        }

        this.applyPropsToOverlays(page);
    }

    // ----------[ Instance Management ]----------

    private updateOverlayUrl(overlayId: string, page: OverlayPage) {
        const overlay = this.instances.get(overlayId);
        overlay.url = new URL(page.overlay.url);
    }

    private handleCommands(overlayId: string, page: OverlayPage) {
        const overlay = this.instances.get(overlayId);
        const commands = page.overlay.__commands;
        overlay.handleCommands(commands);
    }

    private applyPropsToOverlays(page: OverlayPage) {
        for (const [_, overlay] of this.instances.entries()) {
            const props = page.props[overlay.id];
            if (props) {
                overlay.updateProps(props);
            }
        }
    }

    private registerOverlayEventListeners(overlay: ReactiveOverlay): void {
        overlay.onOpen.listen(() => {
            this.stack.push(overlay.id);
        });

        overlay.onClose.listen(() => {
            this.stack.remove(overlay.id);
            overlay.destroy();
        });
    }

}