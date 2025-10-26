<?php

namespace JesseGall\InertiaOverlay;

use Exception;
use InvalidArgumentException;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class OverlayComponentFactory
{

    public function __construct(
        private OverlayComponentRegistrar $registrar,
    ) {}

    public function make(string $type, array $props = []): OverlayComponent
    {
        if (! class_exists($type)) {
            $type = $this->registrar->resolveComponentClass($type);
        }

        return $this->newComponent($type, $props);
    }

    public function tryMake(string $type, array $props = []): OverlayComponent|null
    {
        try {
            return $this->make($type, $props);
        } catch (InvalidArgumentException) {
            return null;
        }
    }

    private function newComponent(string $class, array $props): OverlayComponent
    {
        if (is_subclass_of($class, 'Spatie\\LaravelData\\Data')) {
            return $class::from($props);
        }

        return app($class, $props);
    }

}