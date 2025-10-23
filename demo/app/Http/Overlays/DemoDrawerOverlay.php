<?php

namespace App\Http\Overlays;

use Inertia\Inertia;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlayFlag;
use JesseGall\InertiaOverlay\Enums\OverlaySize;
use JesseGall\InertiaOverlay\Enums\OverlayVariant;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayConfig;

class DemoDrawerOverlay implements OverlayComponent
{

    public function props(Overlay $overlay): array
    {
        return [
            'prop' => 'This is a prop by value',
            'closureProp' => fn() => 'This is a prop from a closure',
            'lazyProp' => Inertia::optional(
                fn() => 'This is a prop from an lazy prop'),
        ];
    }

    public function config(): OverlayConfig
    {
        return new OverlayConfig(
            variant: OverlayVariant::DRAWER,
            size: OverlaySize::XL2,
            flags: [
                OverlayFlag::SKIP_HYDRATION_ON_REFOCUS,
            ]
        );
    }
}