<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

readonly class OverlayResponseFactory
{

    public function redirect(string $component, array $props): RedirectResponse
    {
        return new OverlayRedirectResponse($component, $props);
    }

    public function build(Request $request): OverlayBuilder
    {
        $builder = app(OverlayBuilder::class);

        if ($this->isOpeningNewOverlay($request)) {
            return $builder->new();
        }

        return $builder->fromRequest($request);
    }

    public function render(OverlayComponent|string $component, array $props = []): OverlayResponse
    {
        return $this->build(request())
            ->component($component)
            ->props($props)
            ->render();
    }

    # ---------[ Helpers ]----------

    private function isOpeningNewOverlay(Request $request): bool
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY)) {
            return true;
        }

        if ($request->hasHeader(Header::OVERLAY_OPENING)) {
            return false;
        }

        $from = parse_url($request->header(Header::OVERLAY_URL), PHP_URL_PATH);

        return ltrim($from, '/') !== ltrim($request->path(), '/');
    }


}