<?php

namespace App\Http\Overlays;

use Inertia\Inertia;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlaySize;
use JesseGall\InertiaOverlay\Enums\OverlayVariant;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayAction;
use JesseGall\InertiaOverlay\OverlayConfig;

class DemoDrawerOverlay implements OverlayComponent
{

    private OverlaySize $size = OverlaySize::XL2;

    public function config(Overlay $overlay): OverlayConfig
    {
        return new OverlayConfig(
            variant: OverlayVariant::DRAWER,
            size: $overlay->get('size', $this->size),
        );
    }

    public function props(Overlay $overlay): array
    {
        return [
            'prop' => 'This is a prop by value',
            'closureProp' => fn() => 'This is a prop from a closure',
            'lazyProp' => Inertia::optional(fn() => 'This is a prop from an lazy prop'),
            'message' => $overlay->get('message', 'Initial message'),
        ];
    }

    #[OverlayAction('test')]
    private function testAction(Overlay $overlay): void
    {
        $random = rand(1111, 9999);
        $overlay->put('message', "Message from action testAction(): {$random}");
    }

    #[OverlayAction('resize')]
    private function resizeAction(Overlay $overlay): void
    {
        $overlay->put('size', OverlaySize::cases()[array_rand(OverlaySize::cases())]);

        $overlay->append([
            'someData' => 'This is some data added after resizing the overlay',
            'anotherData' => 'This is another data added after resizing the overlay',
            'randomNumber' => rand(1000, 9999),
        ]);
    }

}