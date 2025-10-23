<?php

namespace App\Http\Overlays;

use App\Http\Middleware\Overlays\TestOverlayMiddleware;
use Inertia\Inertia;
use JesseGall\InertiaOverlay\Contracts\AppliesMiddleware;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlaySize;
use JesseGall\InertiaOverlay\Enums\OverlayVariant;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayConfig;

class DemoModal implements OverlayComponent, AppliesMiddleware
{


    public function __construct(
        public mixed $someValue = null,
    ) {}

    public function config(): OverlayConfig
    {
        return new OverlayConfig(
            variant: OverlayVariant::MODAL,
            size: OverlaySize::XL2,
        );
    }

    public function props(Overlay $overlay): array
    {
        return [
            'prop' => 'This is a prop by value',
            'closureProp' => fn() => 'This is a prop from a closure',
            'lazyProp' => Inertia::optional(fn() => 'This is a prop from an lazy prop'),
            'someValue' => $this->someValue,
        ];
    }

    public static function middleware(): array
    {
        return [
            new TestOverlayMiddleware(),
        ];
    }

}