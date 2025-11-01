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

        if ($this->shouldCreateNewOverlay($request)) {
            $id = $request->hasHeader(Header::OVERLAY_INITIALIZING)
                ? $request->header(Header::OVERLAY_ID)
                : null;

            return $builder->new($id);
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

    private function shouldCreateNewOverlay(Request $request): bool
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY) || $request->hasHeader(Header::OVERLAY_INITIALIZING)) {
            return true;
        }

        $from = parse_url($request->header(Header::OVERLAY_URL), PHP_URL_PATH);

        return ltrim($from, '/') !== ltrim($request->path(), '/');
    }


}