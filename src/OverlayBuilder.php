<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

class OverlayBuilder
{

    public Request|null $request = null;
    public string|null $rootUrl = null;
    public string|null $component = null;
    public array $props = [];

    public function new(): self
    {
        $this->request = null;
        return $this;
    }

    public function fromRequest(Request $request): self
    {
        $this->request = $request;
        return $this;
    }

    public function rootUrl(string $baseUrl): self
    {
        $this->rootUrl = $baseUrl;
        return $this;
    }

    public function component(string $component): self
    {
        $this->component = $component;
        return $this;
    }

    public function props(array $props): self
    {
        $this->props = $props;
        return $this;
    }

    public function with(array|string $props, mixed $value = null): self
    {
        if (is_array($props)) {
            $this->props = array_merge($this->props, $props);
        } else {
            $this->props[$props] = $value;
        }

        return $this;
    }

    public function render(): OverlayResponse
    {
        if ($this->request) {
            $overlay = $this->createFromRequest($this->request);
        } else {
            $overlay = $this->createNew();
        }

        return $overlay->render();
    }

    protected function createFromRequest(Request $request): Overlay
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY)) {
            throw new RuntimeException('No overlay found in the request.');
        }

        $overlay = app(Overlay::class,
            [
                'id' => $request->header(Header::OVERLAY_ID),
                'url' => $request->header(Header::OVERLAY_URL),
                'isOpening' => $request->header(Header::OVERLAY_OPENING) === 'true',
                'rootUrl' => $this->rootUrl ?? $request->fullUrl(),
                'component' => $this->component,
            ]
        );

        $overlay->restoreProps();
        $overlay->mergeProps($this->props);

        return $overlay;
    }

    protected function createNew(): Overlay
    {
        $overlay = app(Overlay::class,
            [
                'id' => Str::random(8),
                'url' => request()->fullUrl(),
                'isOpening' => true,
                'rootUrl' => $this->rootUrl ?? url()->current(),
                'component' => $this->component,
            ]
        );

        $overlay->setProps($this->props);

        return $overlay;
    }


}