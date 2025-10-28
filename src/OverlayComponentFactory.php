<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Exceptions\InvalidComponentTypeException;

class OverlayComponentFactory
{

    /**
     * Create a new OverlayComponent instance
     *
     * @param class-string<OverlayComponent> $type
     * @param array $props
     * @return OverlayComponent
     */
    public function make(string $type, array $props = []): OverlayComponent
    {
        if (! class_exists($type) || ! is_subclass_of($type, OverlayComponent::class)) {
            throw new InvalidComponentTypeException($type);
        }

        if (is_subclass_of($type, 'Spatie\LaravelData\Data')) {
            return $type::from($props);
        }

        return app($type, $props);
    }

}