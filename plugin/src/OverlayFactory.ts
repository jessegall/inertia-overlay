import { Overlay, OverlayArgs, OverlayType } from "./Overlay.ts";
import { randomString } from "./helpers.ts";

export class OverlayFactory {

    public create(type: OverlayType, args: OverlayArgs): Overlay {
        const id = this.generateOverlayId(type, args);
        return new Overlay(id, type, args);
    }

    private generateOverlayId(type: OverlayType, args: OverlayArgs): string {
        args['_instanceId'] = randomString();

        const json = JSON.stringify(args);
        const encoded = encodeURIComponent(json);
        const base64 = btoa(encoded);

        return `${ type }:${ base64 }`;
    }

}