<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class OverlayBuilder
{


    public string|null $id = null;
    public string|null $url = null;
    public string|null $baseUrl = null;
    public array|null $props = null;

    public bool|null $isInitializing = null;

    public function __construct(
        public readonly ComponentFactory $componentFactory,
    ) {}

    public function setId(string $id): self
    {
        $this->id = $id;
        return $this;
    }

    public function setUrl(string $url): self
    {
        $this->url = $url;
        return $this;
    }

    public function setBaseUrl(string $baseUrl): self
    {
        $this->baseUrl = $baseUrl;
        return $this;
    }

    public function setProps(array $props): self
    {
        $this->props = $props;
        return $this;
    }

    public function setIsInitializing(bool $isInitializing): self
    {
        $this->isInitializing = $isInitializing;
        return $this;
    }

    public function build(): Overlay
    {
        return app(Overlay::class,
            [
                'id' => $this->id ?? Str::random(8),
                'url' => $this->url ?? url()->current(),
                'baseUrl' => $this->baseUrl ?? url()->current(),
                'props' => $this->props ?? [],
                'isInitializing' => $this->isInitializing ?? true,
            ]
        );
    }

    public function render(OverlayComponent|string $component): OverlayResponse
    {
        return InertiaOverlay::renderOverlay($this->build(), $component);
    }

}