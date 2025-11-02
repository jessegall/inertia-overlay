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
    public bool|null $initializing = null;

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

    public function setBaseRoute(string $routeName, array $parameters = []): self
    {
        $this->baseUrl = route($routeName, $parameters);
        return $this;
    }

    public function setProps(array $props): self
    {
        $this->props = $props;
        return $this;
    }

    public function setInitializing(bool $initializing): self
    {
        $this->initializing = $initializing;
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
                'initializing' => $this->initializing ?? true,
            ]
        );
    }

    public function render(OverlayComponent|string $component): OverlayResponse
    {
        return InertiaOverlay::renderOverlay($this->build(), $component);
    }

}