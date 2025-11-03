<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

readonly class PageOverlayComponent implements OverlayComponent
{

    public function __construct(
        public string $component,
        public array $props = [],
    ) {}

    public function name(): string
    {
        return $this->component;
    }

    public function config(Overlay $overlay): OverlayConfig
    {
        return $overlay->config;
    }

    public function props(Overlay $overlay): array
    {
        return $this->props;
    }

}