<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use JesseGall\InertiaOverlay\ComponentFactory;
use JesseGall\InertiaOverlay\Header;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayActionRunner;

class OverlayController extends Controller
{

    public function __construct(
        private readonly OverlayActionRunner $overlayActionRunner,
        private readonly ComponentFactory $componentFactory,
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
        [$overlay, $component] = Overlay::fromSession($request->header(Header::OVERLAY_ID));

        if (is_string($component)) {
            $component = $this->componentFactory->make($component, $overlay->getInitialProps());
        }

        $this->overlayActionRunner->run($overlay, $component, $action);

        return $overlay->render($component);
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