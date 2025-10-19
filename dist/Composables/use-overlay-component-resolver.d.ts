import { Component } from 'vue';

export declare function useOverlayComponentResolver(): {
    resolve: (type: string) => Promise<Component>;
};
