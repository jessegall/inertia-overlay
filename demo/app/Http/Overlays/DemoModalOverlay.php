<?php

namespace App\Http\Overlays;

use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlaySize;
use JesseGall\InertiaOverlay\OverlayVariant;

class DemoModalOverlay implements Overlay
{

    public function variant(): OverlayVariant
    {
        return OverlayVariant::MODAL;
    }

    public function size(): OverlaySize
    {
        return OverlaySize::XL5;
    }

    public function props(): array
    {
        return [

        ];
    }

}