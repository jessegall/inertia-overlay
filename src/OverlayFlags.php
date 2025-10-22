<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Flags\SkipHydrationOnFocus;

readonly class OverlayFlags
{

    public function __construct(
        public OverlayComponent $component,
    ) {}

    public function skipHydrationOnFocus(): bool
    {
        return $this->component instanceof SkipHydrationOnFocus;
    }

}