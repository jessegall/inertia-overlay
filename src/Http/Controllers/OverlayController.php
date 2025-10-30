<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class OverlayController extends Controller
{

    public function __invoke(Request $request, string $component)
    {
        if (base64_encode(base64_decode($component, true)) === $component) {
            $component = base64_decode($component);
        }

        return Inertia::overlay($component, $request->all());
    }

}