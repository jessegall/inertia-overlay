import { RequestConfig } from "./OverlayRequestBuilder.ts";
import { Page } from "@inertiajs/core";
import { router } from "@inertiajs/vue3";

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export class InertiaRouterAdapter {

    public get<T extends Page>(url: URL, config: RequestConfig): Promise<T> {
        return this.method('get', url, config);
    }

    public post<T extends Page>(url: URL, config: RequestConfig): Promise<T> {
        return this.method('post', url, config);
    }

    public put<T extends Page>(url: URL, config: RequestConfig): Promise<T> {
        return this.method('put', url, config);
    }

    public patch<T extends Page>(url: URL, config: RequestConfig): Promise<T> {
        return this.method('patch', url, config);
    }

    public delete<T extends Page>(url: URL, config: RequestConfig): Promise<T> {
        return this.method('delete', url, config);
    }

    public method<T extends Page>(method: HttpMethod, url: URL, config: RequestConfig): Promise<T> {
        return new Promise((resolve, reject) => {

            method = method.toLowerCase() as HttpMethod;

            function onSuccess(page: Page) {
                try {
                    config.validator?.(page);
                    resolve(page as T);
                } catch (error) {
                    reject(error);
                }
            }

            if (method === 'delete') {
                router.delete(url, {
                    ...config.options,
                    data: config.data,
                    onSuccess: onSuccess,
                    onError: reject,
                });
            } else {
                router[method](url, config.data, {
                    ...config.options,
                    onSuccess: onSuccess,
                    onError: reject,
                });
            }

        })
    }

}