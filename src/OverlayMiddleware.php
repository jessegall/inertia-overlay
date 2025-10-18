<?php

namespace JesseGall\InertiaOverlay;

use Closure;

interface OverlayMiddleware
{

    /**
     * @param OverlayContext $context
     * @param (Closure(OverlayContext): Overlay) $next
     * @return Overlay
     */
    public function handle(OverlayContext $context, Closure $next): Overlay;

}