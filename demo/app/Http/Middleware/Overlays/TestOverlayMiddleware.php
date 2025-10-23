<?php

namespace App\Http\Middleware\Overlays;

use Closure;
use JesseGall\InertiaOverlay\Contracts\OverlayMiddleware;
use JesseGall\InertiaOverlay\Overlay;

class TestOverlayMiddleware implements OverlayMiddleware
{

    public function handle(Overlay $overlay, Closure $next)
    {
        $overlay->arguments['someValue'] = 'This value was added in the middleware.';
        return $next($overlay);
    }

}