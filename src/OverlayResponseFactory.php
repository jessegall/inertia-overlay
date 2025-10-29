<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\RedirectResponse;

readonly class OverlayResponseFactory
{

    public function redirect(string $component, array $props): RedirectResponse
    {
        return new OverlayRedirectResponse($component, $props);
    }

    public function render(string $component, array $props = []): OverlayResponse
    {
        $request = request();

        return new OverlayResponseBuilder()
            ->setComponent($component)
            ->setProps($props)
            ->render($request);
    }

    public function builder(): OverlayResponseBuilder
    {
        return new OverlayResponseBuilder();
    }


}