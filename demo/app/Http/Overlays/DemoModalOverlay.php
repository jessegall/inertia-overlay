<?php

namespace App\Http\Overlays;

use Inertia\Inertia;
use JesseGall\InertiaOverlay\OverlayComponent;
use JesseGall\InertiaOverlay\OverlaySize;
use JesseGall\InertiaOverlay\OverlayVariant;

class DemoModalOverlay implements OverlayComponent
{

    public function variant(): OverlayVariant
    {
        return OverlayVariant::MODAL;
    }

    public function size(): OverlaySize
    {
        return OverlaySize::XL2;
    }

    public function props(): array
    {
        return [
            'prop' => 'This is a prop by value',
            'closureProp' => fn() => 'This is a prop from a closure',
            'lazyProp' => Inertia::optional(fn() => 'This is a prop from an lazy prop'),

            'list' => fn() => array_map(
                fn($i) => [
                    'id' => $i,
                    'name' => "Item #{$i}",
                ],
                range(1, rand(5, 15))
            )
        ];
    }

}