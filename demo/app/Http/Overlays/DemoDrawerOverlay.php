<?php

namespace App\Http\Overlays;

use Inertia\Inertia;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlayFlag;
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
            size: session()->get("{$overlay->getInstanceId()}.size", $this->size),
            flags: [
                OverlayFlag::SKIP_HYDRATION_ON_REFOCUS,
            ]
        );
    }

    public function props(Overlay $overlay): array
    {
        return [
            'prop' => 'This is a prop by value',
            'closureProp' => fn() => 'This is a prop from a closure',
            'lazyProp' => Inertia::optional(fn() => 'This is a prop from an lazy prop'),
            'message' => session()->get("{$overlay->getInstanceId()}.message"),
        ];
    }

    #[OverlayAction('test')]
    private function testAction(Overlay $overlay): void
    {
        $random = rand(1111, 9999);
        session()->flash("{$overlay->getInstanceId()}.message", "This is a message from action testAction(): {$random}");
        $overlay->refresh();
    }

    #[OverlayAction('resize')]
    private function resizeAction(Overlay $overlay): void
    {
        $this->size = OverlaySize::cases()[array_rand(OverlaySize::cases())];
        session()->put("{$overlay->getInstanceId()}.size", $this->size);
        $overlay->refresh();
    }

}