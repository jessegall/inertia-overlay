<?php

namespace Tests\Mocks;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayConfig;

class MockOverlayComponent implements OverlayComponent
{

    public function __construct(
        public array $props = [],
    ) {}

    public function name(): string
    {
        return 'MockComponent';
    }

    public function config(Overlay $overlay): OverlayConfig
    {
        return new OverlayConfig();
    }

    public function props(Overlay $overlay): array
    {
        return $this->props;
    }

}