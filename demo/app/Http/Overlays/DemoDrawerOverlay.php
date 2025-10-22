<?php

namespace App\Http\Overlays;

use Inertia\Inertia;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlaySize;
use JesseGall\InertiaOverlay\OverlayVariant;

class DemoDrawerOverlay implements Overlay
{

    public function variant(): OverlayVariant
    {
        return OverlayVariant::DRAWER;
    }

    public function size(): OverlaySize
    {
        return OverlaySize::XL5;
    }

    public function props(): array
    {
        return [
            'prop' => 'This is a prop by value',
            'closureProp' => fn() => 'This is a prop from a closure',
            'lazyProp' => Inertia::optional(fn() => 'This is a prop from an lazy prop'),
        ];
    }

}