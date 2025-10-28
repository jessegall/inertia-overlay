<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\RedirectResponse;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

readonly class OverlayResponseFactory
{

    public function __construct(
        private OverlayComponentRegistrar $componentRegistrar,
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
            $component = $this->makeComponent($component, $overlay->getProps());
        }

        $overlay->setComponent($component);

        return $overlay->render();
    }

    private function makeComponent(string $component, array $props): OverlayComponent
    {
        if (class_exists($component)) {
            return $this->componentFactory->make($component, $props);
        }

        if ($this->componentRegistrar->isRegistered($component)) {
            $component = $this->componentRegistrar->resolveComponentClass($component);
            return $this->componentFactory->make($component, $props);
        }

        return new AnonymouseOverlayComponent($component, $props);
    }

}