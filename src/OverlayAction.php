<?php

namespace JesseGall\InertiaOverlay;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
class OverlayAction
{

    public function __construct(
        public readonly string|null $name = null,
    ) {}

}