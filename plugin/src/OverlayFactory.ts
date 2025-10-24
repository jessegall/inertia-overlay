import { Overlay, OverlayArgs, OverlayType } from "./Overlay.ts";
import { randomString, toReadonly } from "./helpers.ts";
import { OverlayRouter } from "./OverlayRouter.ts";
import { Component, defineAsyncComponent, Reactive, ShallowRef, shallowRef } from "vue";
import { OverlayComponentResolver } from "./OverlayPlugin.ts";

export type ReadonlyOverlay = Readonly<Reactive<Overlay>>;

export class OverlayFactory {

    constructor(
        private readonly componentResolver: OverlayComponentResolver,
        private readonly router: OverlayRouter,
    ) {}

    public make(type: OverlayType, args: OverlayArgs): ReadonlyOverlay {
        const overlay = new Overlay(this.router, {
            id: this.generateOverlayId(type, args),
            component: this.resolveComponent(type),
        });

        return toReadonly(overlay);
    }

    public makeFromId(overlayId: string): ReadonlyOverlay {
        const [component] = overlayId.split(':');

        const overlay = new Overlay(this.router, {
            id: overlayId,
            component: this.resolveComponent(component),
        });

        return toReadonly(overlay);
    }

    private resolveComponent(type: string): ShallowRef<Component> {
        return shallowRef(defineAsyncComponent(this.componentResolver(type)));
    }

    private generateOverlayId(type: OverlayType, args: OverlayArgs): string {
        args['_instanceId'] = randomString();

        const json = JSON.stringify(args);
        const encoded = encodeURIComponent(json);
        const base64 = btoa(encoded);

        return `${ type }:${ base64 }`;
    }

}