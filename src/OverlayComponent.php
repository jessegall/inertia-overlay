<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Arrayable;

interface OverlayComponent
{

    public function variant(): OverlayVariant;

    public function size(): OverlaySize;

    public function props(): array|Arrayable;

}