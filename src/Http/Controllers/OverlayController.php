<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayComponentFactory;

class OverlayController extends Controller
{

    public function __construct(
        private readonly OverlayComponentFactory $overlayComponentFactory,
    ) {}

    public function __invoke(Request $request, string $type)
    {
        if ($request->inertiaOverlay()) {
            $overlay = Overlay::fromRequest($request);
        } else {
            $overlay = Overlay::new();
        }

        if (! $request->inertiaOverlay()) {
            return redirect($overlay->getBaseUrl());
        }

        $component = $this->overlayComponentFactory->make($type);

        return $overlay->render($component);
    }

}