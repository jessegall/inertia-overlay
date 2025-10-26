<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OverlayController extends Controller
{

    public function __invoke(Request $request, string $type)
    {
        ray('OverlayController invoked', $type, $request->input());

        return Inertia::overlay($type, $request->input());
    }

}