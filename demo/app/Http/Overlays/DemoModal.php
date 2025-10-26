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

    public function name(): string
    {
        return 'DemoModal';
    }

    public function config(Overlay $overlay): OverlayConfig
    {
        return new OverlayConfig(
            variant: OverlayVariant::MODAL,
            size: $overlay->remember('size', OverlaySize::cases()[array_rand(OverlaySize::cases())]),
            flags: []
        );
    }

    public function props(Overlay $overlay): array
    {
        return [
            'prop' => 'This is a prop by value',
            'closureProp' => fn() => 'This is a prop from a closure',
            'lazyProp' => Inertia::optional(fn() => 'This is a prop from an lazy prop'),
            'someValue' => $this->someValue,
            'deferredProp' => Inertia::defer(function () {
                return [
                    'message' => 'This is a deferred prop',
                    'timestamp' => now()->toDateTimeString(),
                ];
            }),
            'mergeProp' => Inertia::merge([
                [
                    'id' => $id = random_int(0, 5),
                    'name' => 'Item ' . $id . " " . random_int(1111, 9999),
                ],
            ])->matchOn('id'),
        ];
    }

    public static function middleware(): array
    {
        return [
            new TestOverlayMiddleware(),
        ];
    }

}