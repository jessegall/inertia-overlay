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
        public bool|string $displayUrl = true,
    ) {}

    public function toArray(): array
    {
        return [
            'variant' => $this->variant->value,
            'size' => $this->size->value,
            'displayUrl' => $this->displayUrl,
        ];
    }

    public static function fromArray(array $config): static
    {
        $instance = new static();

        if (isset($config['variant'])) {
            $instance->variant = OverlayVariant::from($config['variant']);
        }

        if (isset($config['size'])) {
            $instance->size = OverlaySize::from($config['size']);
        }

        if (isset($config['displayUrl'])) {
            $instance->displayUrl = $config['displayUrl'];
        }

        return $instance;
    }

}