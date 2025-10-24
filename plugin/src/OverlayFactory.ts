import { Overlay, OverlayArgs, OverlayType } from "./Overlay.ts";
import { randomString, toReadonly } from "./helpers.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { Component, defineAsyncComponent, Reactive, ShallowRef, shallowRef } from "vue";
import { OverlayComponentResolver } from "./OverlayPlugin.ts";

export type ReadonlyOverlay = Readonly<Reactive<Overlay>>;

export type CreateOverlayOptions = {
    type: OverlayType;
    args: OverlayArgs
} | {
    id: string;
}

export class OverlayFactory {

    constructor(
        private readonly componentResolver: OverlayComponentResolver,
        private readonly router: OverlayRouter,
    ) {}

    // ----------[ Api ]----------

    public make(options: CreateOverlayOptions) {
        if ('type' in options) {
            return this.makeFromType(options.type, options.args);
        } else {
            return this.makeFromId(options.id);
        }
    }

    public makeFromType(type: OverlayType, args: OverlayArgs): ReadonlyOverlay {
        const overlay = new Overlay(this.router, {
            id: this.generateOverlayId(type, args),
            component: this.resolveComponent(type),
        });

        return toReadonly(overlay);
    }

    public makeFromId(overlayId: string): ReadonlyOverlay {
        const [type] = overlayId.split(':');

        const overlay = new Overlay(this.router, {
            id: overlayId,
            component: this.resolveComponent(type),
        });

        return toReadonly(overlay);
    }

    // ----------[ Internal ]----------

    private resolveComponent(type: string): ShallowRef<Component> {
        return shallowRef(defineAsyncComponent(this.componentResolver(type)));
    }

    private generateOverlayId(type: OverlayType, args: OverlayArgs): string {
        args['_salt'] = randomString();

        const json = JSON.stringify(args);
        const encoded = encodeURIComponent(json);
        const base64 = btoa(encoded);

        return `${ type }:${ base64 }`;
    }

}