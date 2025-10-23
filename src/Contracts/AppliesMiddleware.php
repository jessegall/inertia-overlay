<?php

namespace JesseGall\InertiaOverlay\Contracts;

interface AppliesMiddleware
{

    /**
     * @return class-string<OverlayMiddleware>[]
     */
    public static function middleware(): array;

}