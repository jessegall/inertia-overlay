<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use JesseGall\InertiaOverlay\ActionRegistry;
use JesseGall\InertiaOverlay\Header;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlaySession;

class OverlayController extends Controller
{

    public function __construct(
        private readonly ActionRegistry $actionRegistry,
    ) {}

    public function overlay(Request $request, string $component)
    {
        if (base64_encode(base64_decode($component, true)) === $component) {
            $component = base64_decode($component);
        }

        return Inertia::overlay($component, $this->resolveProps($request));
    }

    public function action(Request $request, string $action)
    {
        $overlay = Overlay::load($request->header(Header::OVERLAY_ID));

        if ($response = $this->actionRegistry->invoke($overlay, $overlay->component, $action)) {
            return $response;
        }

        return $overlay->render();
    }

    # ----------[ Helpers ]----------

    private function resolveProps(Request $request): array
    {
        if ($parameters = parse_url($request->fullUrl(), PHP_URL_QUERY)) {
            parse_str($parameters, $data);
            return $data;
        }

        return [];
    }

}