import { RequestConfig } from "./OverlayRequestBuilder.ts";
import { Page } from "@inertiajs/core";
import { router } from "@inertiajs/vue3";

type HttpMethod = 'get' | 'post';

export class InertiaRouterAdapter {

    public get<T extends Page>(url: URL, config: RequestConfig): Promise<T> {
        return this.method('get', url, config);
    }

    public post<T extends Page>(url: URL, config: RequestConfig): Promise<T> {
        return this.method('post', url, config);
    }

    private method<T extends Page>(method: HttpMethod, url: URL, config: RequestConfig): Promise<T> {
        return new Promise((resolve, reject) => {
            router[method](url, config.data, {
                ...config.options,
                onSuccess: (page) => {
                    try {
                        try {
                            config.validator?.(page);
                        } catch (error) {
                            return reject(error);
                        }
                        resolve(page as T);
                    } catch (error) {
                        reject(error);
                    }
                },
                onError: reject,
            });
        })
    }

}