<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class Config
{

    public function getMiddleware(): array
    {
        return config('overlays.middleware', []);
    }

    /**
     * @return array<string, class-string<OverlayComponent>>
     */
    public function getComponents(): array
    {
        return config('overlays.components', []);
    }

}