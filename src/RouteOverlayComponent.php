<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

readonly class RouteOverlayComponent implements OverlayComponent
{

    public function __construct(
        public string $component,
        public array $props = [],
        public OverlayConfig $config = new OverlayConfig(),
    ) {}

    public function name(): string
    {
        return $this->component;
    }

    public function config(Overlay $overlay): OverlayConfig
    {
        return $this->config;
    }

    public function props(Overlay $overlay): array
    {
        return $this->props;
    }

}