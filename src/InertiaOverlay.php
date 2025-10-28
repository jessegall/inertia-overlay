<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Support\Facades\Facade;

/**
 * @method static \Illuminate\Http\RedirectResponse redirect(string $component, array $props = [])
 * @method static \JesseGall\InertiaOverlay\OverlayResponse render(Overlay $overlay)
 */
class InertiaOverlay extends Facade
{

    protected static function getFacadeAccessor(): string
    {
        return OverlayResponseFactory::class;
    }

}