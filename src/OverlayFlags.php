<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Flags\SkipHydrationOnRefocus;

readonly class OverlayFlags
{

    public function __construct(
        public OverlayComponent $component,
    ) {}

    public function skipHydrationOnRefocus(): bool
    {
        return $this->component instanceof SkipHydrationOnRefocus;
    }

}