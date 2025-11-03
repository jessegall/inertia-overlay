<?php

namespace Tests\Feature\Concerns;

trait GeneratesFakePageData
{


    protected function generateFakePageData(string $overlayId = 'fake-overlay-id', array $props = [], array $pageProps = []): array
    {
        return [
            "component" => "Dashboard",
            "props" => [
                ...$pageProps,
                $overlayId => $props,
            ],
            "url" => "/dashboard",
            "version" => "1",
            "clearHistory" => false,
            "encryptHistory" => false,
            "overlay" => [
                "id" => $overlayId,
                "url" => "http://localhost/dashboard/overlay",
                "component" => "FakeOverlayComponent",
                "componentClass" => "App\Http\View\Overlays\FakeOverlayComponent",
                "config" => [
                    "variant" => "drawer",
                    "size" => "3xl",
                ],
                "baseUrl" => "http://localhost/dashboard",
                "method" => "GET",
                "closeRequested" => false,
            ],
        ];
    }

}