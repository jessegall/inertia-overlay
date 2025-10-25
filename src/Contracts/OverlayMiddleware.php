<?php

namespace JesseGall\InertiaOverlay\Contracts;

use Closure;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayInput;

interface OverlayMiddleware
{

    /**
     * @param OverlayInput $arguments
     * @param (Closure(Overlay): Overlay) $next
     * @return Overlay
     */
    public function handle(OverlayInput $arguments, Closure $next);

}