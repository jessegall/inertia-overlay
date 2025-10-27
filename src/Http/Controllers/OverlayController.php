<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use JesseGall\InertiaOverlay\InertiaOverlay;
use JesseGall\InertiaOverlay\Overlay;

class OverlayController extends Controller
{

    public function __invoke(Request $request, string $component)
    {
        $overlay = Overlay::fromRequest($request);

        return InertiaOverlay::renderUsing($component, $overlay, $request->except('_props'));
    }

}