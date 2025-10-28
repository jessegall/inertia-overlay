<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;

class OverlayController extends Controller
{

    public function __invoke(Request $request, string $component)
    {
        return Inertia::overlay($component);
    }

}