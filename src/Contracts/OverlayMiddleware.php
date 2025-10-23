<?php

namespace JesseGall\InertiaOverlay\Contracts;

use Closure;
use JesseGall\InertiaOverlay\Overlay;

interface OverlayMiddleware
{

    /**
     * @param Overlay $overlay
     * @param (Closure(Overlay): Overlay) $next
     * @return Overlay
     */
    public function handle(Overlay $overlay, Closure $next);

}