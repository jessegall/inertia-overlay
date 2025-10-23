<?php

namespace JesseGall\InertiaOverlay\Contracts;

use JesseGall\InertiaOverlay\Enums\OverlayFlag;

interface DefinesFlags
{

    /**
     * @return OverlayFlag[]
     */
    public function flags(): array;

}