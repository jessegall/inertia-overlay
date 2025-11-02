<?php

namespace JesseGall\InertiaOverlay\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Inertia\Inertia;
use JesseGall\InertiaOverlay\ComponentFactory;
use JesseGall\InertiaOverlay\OverlayActionRunner;
use JesseGall\InertiaOverlay\OverlayBuilder;

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
        $overlay = app(OverlayBuilder::class)
            ->props($request->get('__overlay'))
            ->fromRequest($request)
            ->build();

        $component = $this->componentFactory->make($overlay->get('render.component'), $overlay->getInitialProps());

        if ($response = $this->overlayActionRunner->run($overlay, $component, $action)) {
            return $response;
        }

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