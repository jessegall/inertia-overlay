<?php

namespace App\Http\Middleware\Overlays;

use Closure;
use JesseGall\InertiaOverlay\Contracts\OverlayMiddleware;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayInput;

class TestOverlayMiddleware implements OverlayMiddleware
{

    public function handle(OverlayInput $arguments, Closure $next)
    {
        return $next($arguments);
    }

}