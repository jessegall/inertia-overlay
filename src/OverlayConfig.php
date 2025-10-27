<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Arrayable;
use JesseGall\InertiaOverlay\Enums\OverlaySize;
use JesseGall\InertiaOverlay\Enums\OverlayVariant;

class OverlayConfig implements Arrayable
{

    public function __construct(
        public OverlayVariant $variant = OverlayVariant::MODAL,
        public OverlaySize $size = OverlaySize::XL2,
    ) {}

    public function toArray(): array
    {
        return [
            'variant' => $this->variant->value,
            'size' => $this->size->value,
        ];
    }

}