<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\RedirectResponse;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

readonly class OverlayResponseFactory
{

    public function __construct(
        private OverlayComponentFactory $componentFactory,
    ) {}

    public function render(OverlayComponent|string $component, array $props = []): OverlayResponse|RedirectResponse
    {
        $request = request();

        if ($request->hasHeader(Header::INERTIA_OVERLAY)) {
            $overlay = Overlay::fromRequest($request);
        } else {
            $overlay = Overlay::new($props);
        }

        if ($overlay->getPageComponent() === null) {
            return redirect('/');
        }

        if (is_string($component)) {
            $component = $this->makeComponent($component, $props);
        }

        return $overlay->render($component);
    }

    public function renderUsing(string $component, Overlay $overlay, array $props = []): OverlayResponse|RedirectResponse
    {
        $component = $this->makeComponent($component, [
            ...$overlay->getProps(),
            ...$props,
        ]);

        return $overlay->render($component);
    }

    private function makeComponent(string $component, array $props): OverlayComponent
    {
        return $this->componentFactory->tryMake($component, $props)
            ?? new AnonymouseOverlayComponent($component, $props);
    }


}