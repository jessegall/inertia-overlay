import { Overlay, OverlayOptions } from "./Overlay.ts";
import { randomString, toReadonly } from "./helpers.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { Reactive } from "vue";

export type ReadonlyOverlay = Readonly<Reactive<Overlay>>;
export type MakeOverlayOptions = Omit<OverlayOptions, 'id'> & {
    id?: string;
}

export class OverlayFactory {

    constructor(
        private readonly router: OverlayRouter,
    ) {}

    // ----------[ Api ]----------

    public make(options: MakeOverlayOptions): ReadonlyOverlay {
        console.log(options);

        const overlay = new Overlay(this.router, {
            id: randomString(),
            ...options,
        });

        return toReadonly(overlay);
    }

}