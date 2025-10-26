<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\InertiaOverlay;
use JesseGall\InertiaOverlay\Overlay;

class OverlayController extends Controller
{

    public function __invoke(Request $request, string $component)
    {
        $instance = $request->query('overlay');

        if ($instance) {
            $overlay = Overlay::fromInstance($instance);
        } else {
            $overlay = Overlay::fromRequest($request);
        }

        return InertiaOverlay::renderUsing($component, $overlay, $request->input());
    }

}