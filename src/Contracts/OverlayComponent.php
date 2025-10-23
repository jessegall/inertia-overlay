<?php

namespace JesseGall\InertiaOverlay\Contracts;

use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayConfig;

interface OverlayComponent
{

    public function config(): OverlayConfig;

    public function props(Overlay $overlay): array;

}