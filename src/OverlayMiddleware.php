<?php

namespace JesseGall\InertiaOverlay;

use Closure;

interface OverlayMiddleware
{

    /**
     * @param OverlayContext $context
     * @param (Closure(OverlayContext): OverlayComponent) $next
     * @return OverlayComponent
     */
    public function handle(OverlayContext $context, Closure $next): OverlayComponent;

}