<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\RedirectResponse;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class OverlayResponseFactory
{

    public function __construct(
        private readonly OverlayComponentFactory $componentFactory,
    ) {}

    public function render(OverlayComponent|string $component, array $props = []): OverlayResponse|RedirectResponse
    {
        $request = request();

        if ($request->header(Header::OVERLAY_ID)) {
            $overlay = Overlay::fromRequest($request);
        } else {
            $overlay = Overlay::new($request->query('overlay'));
        }

        if (! $request->inertia()) {
            return redirect($overlay->getBaseUrl());
        }

        if (is_string($component)) {
            $component = $this->makeComponent($component, $props);
        }

        return $overlay->render($component);
    }

    private function makeComponent(string $component, array $props): OverlayComponent
    {
        return $this->componentFactory->tryMake($component, $props)
            ?? new AnonymouseOverlayComponent($component, $props);
    }


}