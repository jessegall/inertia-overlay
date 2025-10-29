<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

readonly class ComponentFactory
{

    public function __construct(
        private ComponentRegistrar $registrar,
    ) {}

    /**
     * Create a new OverlayComponent instance
     *
     * @param class-string<OverlayComponent> $type
     * @param array $props
     * @return OverlayComponent
     */
    public function make(string $type, array $props = []): OverlayComponent
    {
        if (! class_exists($type)) {
            return $this->make($this->registrar->resolveClass($type), $props);
        }

        if (is_subclass_of($type, 'Spatie\LaravelData\Data')) {
            return $type::from($props);
        }

        return app($type, $props);
    }


}