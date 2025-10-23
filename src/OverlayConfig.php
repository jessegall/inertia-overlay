<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Enums\OverlayFlag;
use JesseGall\InertiaOverlay\Enums\OverlaySize;
use JesseGall\InertiaOverlay\Enums\OverlayVariant;

class OverlayConfig
{

    public function __construct(
        public OverlayVariant $variant = OverlayVariant::MODAL,
        public OverlaySize $size = OverlaySize::XL3,
        public array $flags = [],
    ) {}

    public function hasFlag(OverlayFlag $flag): bool
    {
        return in_array($flag, $this->flags, true);
    }

}