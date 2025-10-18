<?php

namespace JesseGall\InertiaOverlay;

interface SupportsMiddleware
{

    /** @return class-string<SupportsMiddleware>[] */
    public static function middleware(): array;

}