<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class OverlayResponseBuilder
{

    public bool $loadFromRequest = false;
    public string|null $baseUrl = null;
    public string|null $component = null;
    public array $props = [];

    public function setLoadFromRequest(bool $new): self
    {
        $this->loadFromRequest = $new;
        return $this;
    }

    public function setBaseUrl(string $baseUrl): self
    {
        $this->baseUrl = $baseUrl;
        return $this;
    }

    public function setComponent(string $component): self
    {
        $this->component = $component;
        return $this;
    }

    public function setProps(array $props): self
    {
        $this->props = $props;
        return $this;
    }

    public function render(Request $request): OverlayResponse
    {
        if ($this->shouldOpenNewOverlay($request)) {
            $overlay = Overlay::new($this->component, $this->props);
        } else {
            $overlay = Overlay::fromRequest(request(), $this->component, $this->props);
        }

        $overlay->setBaseUrl($this->baseUrl);

        return $overlay->render();
    }

    private function shouldOpenNewOverlay(Request $request): bool
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY)) {
            return true;
        }

        if ($request->hasHeader(Header::OVERLAY_OPENING)) {
            return false;
        }

        return $this->resolvePath($request->header(Header::OVERLAY_URL)) !== $this->resolvePath($request->url());
    }

    private function resolvePath(string $url): string
    {
        return rtrim(parse_url(URL::to($url), PHP_URL_PATH), '/');
    }

}