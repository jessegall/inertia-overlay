import { Overlay, OverlayArgs, OverlayType } from "./Overlay.ts";
import { randomString, toReadonly } from "./helpers.ts";
import { OverlayRequest } from "./OverlayRequest.ts";
import { defineAsyncComponent, Reactive, shallowRef } from "vue";
import { OverlayComponentResolver } from "./OverlayPlugin.ts";

export type ReadonlyOverlay = Readonly<Reactive<Overlay>>;

export class OverlayFactory {

    constructor(
        private readonly componentResolver: OverlayComponentResolver,
        private readonly request: OverlayRequest,
    ) {}

    public make(type: OverlayType, args: OverlayArgs): ReadonlyOverlay {
        const id = this.generateOverlayId(type, args);
        const component = defineAsyncComponent(this.componentResolver(type))
        const overlay = new Overlay(id, type, args, this.request, shallowRef(component));
        return toReadonly(overlay);
    }

    private generateOverlayId(type: OverlayType, args: OverlayArgs): string {
        args['_instanceId'] = randomString();

        const json = JSON.stringify(args);
        const encoded = encodeURIComponent(json);
        const base64 = btoa(encoded);

        return `${ type }:${ base64 }`;
    }

}