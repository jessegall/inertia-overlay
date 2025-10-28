<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

readonly class OverlayResponseFactory
{

    public static function redirect(string $component, array $props): RedirectResponse
    {
        $component = base64_encode($component);

        return redirect()->to("/overlay/$component?" . http_build_query($props));
    }

    public function render(string $component, array $props = []): OverlayResponse
    {
        $request = request();

        if ($this->shouldOpenNewOverlay($request)) {
            $overlay = Overlay::new($component, $props);
        } else {
            $overlay = Overlay::fromRequest($request, $component, $props);
        }

        return $overlay->render();
    }

    private function shouldOpenNewOverlay(Request $request): bool
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY)) {
            return true;
        }

        if ($request->hasHeader(Header::OVERLAY_OPENING) || $request->hasHeader(Header::OVERLAY_REFOCUS)) {
            return false;
        }

        return $this->resolvePath($request->header(Header::OVERLAY_URL)) !== $this->resolvePath($request->url());
    }

    private function resolvePath(string $url): string
    {
        return rtrim(parse_url(URL::to($url), PHP_URL_PATH), '/');
    }

}