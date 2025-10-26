<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\InertiaOverlay;

class OverlayController extends Controller
{

    public function __invoke(Request $request, string $type)
    {
        return InertiaOverlay::render($type, $this->resolveArgs($request));
    }
    
    private function resolveArgs(Request $request): array
    {
        $_args = $request->query('_args');

        if (! $_args) {
            return [];
        }

        return json_decode(base64_decode($_args), true) ?? [];
    }


}