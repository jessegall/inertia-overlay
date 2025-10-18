<?php

namespace JesseGall\InertiaOverlay;

interface SupportsMiddleware
{

    /** @return class-string<OverlayMiddleware>[] */
    public static function middleware(): array;

}