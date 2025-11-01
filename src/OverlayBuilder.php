<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use RuntimeException;

class OverlayBuilder
{

    public Request|null $request = null;
    public string|null $baseUrl = null;
    public OverlayComponent|string|null $component = null;
    public array $props = [];

    public function __construct(
        public readonly ComponentFactory $componentFactory,
    ) {}

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

    public function baseUrl(string $baseUrl): self
    {
        $this->baseUrl = $baseUrl;
        return $this;
    }

    public function component(OverlayComponent|string $component): self
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

        if (is_string($this->component)) {
            $component = $this->componentFactory->make($this->component, $this->props);
        } else {
            $component = $this->component;
        }

        return $overlay->render($component);
    }

    public function createFromRequest(Request $request): Overlay
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY)) {
            throw new RuntimeException('No overlay found in the request.');
        }

        return app(Overlay::class,
            [
                'id' => $request->header(Header::OVERLAY_ID),
                'url' => $request->header(Header::OVERLAY_URL),
                'isOpening' => $request->header(Header::OVERLAY_OPENING) === 'true',
                'baseUrl' => $this->baseUrl ?? $request->fullUrl(),
                'initialProps' => $this->props,
            ]
        );
    }

    public function createNew(): Overlay
    {
        return app(Overlay::class,
            [
                'id' => Str::random(8),
                'url' => request()->fullUrl(),
                'isOpening' => true,
                'baseUrl' => $this->baseUrl ?? url()->current(),
                'initialProps' => $this->props,
            ]
        );
    }


}