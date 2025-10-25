<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Arrayable;
use JesseGall\InertiaOverlay\Enums\OverlayFlag;
use JesseGall\InertiaOverlay\Enums\OverlaySize;
use JesseGall\InertiaOverlay\Enums\OverlayVariant;

class OverlayConfig implements Arrayable
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

    public function toArray(): array
    {
        return [
            'variant' => $this->variant->value,
            'size' => $this->size->value,
            'flags' => array_map(fn(OverlayFlag $flag) => $flag->value, $this->flags),
        ];
    }
    
}