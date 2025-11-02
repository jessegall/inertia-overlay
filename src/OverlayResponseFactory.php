<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use RuntimeException;

readonly class OverlayResponseFactory
{

    public function __construct(
        protected ComponentRegistrar $componentRegistrar,
        protected ComponentFactory $componentFactory,
        protected OverlayBuilder $overlayBuilder,
    ) {}

    public function build(Closure $build): OverlayResponse
    {
        $request = request();

        if ($this->shouldCreateNewOverlay($request)) {
            $result = $build($this->overlayBuilder);
        } else {
            $result = $this->buildOverlayFromSession($request);
        }

        if ($result instanceof OverlayBuilder) {
            $result = $result->build();
        }

        if ($result instanceof Overlay) {
            $session = OverlaySession::load($result->getId());
            $componentClass = $session->meta('componentClass');

            if (! $componentClass) {
                throw new RuntimeException(sprintf(
                    "Could not determine component class for overlay with ID %s. And no previous session exists. Did you forget to call render()?",
                    $result->getId()
                ));
            }

            return $this->renderOverlay($result, $componentClass);
        }

        return $result;
    }

    public function render(OverlayComponent|string $component, array $props = []): OverlayResponse
    {
        $request = request();

        if ($this->shouldCreateNewOverlay($request)) {
            $overlay = $this->buildNewOverlay($request, $props);
        } else {
            $overlay = $this->buildOverlayFromSession($request);
        }

        if (is_string($component)) {
            $component = $this->buildComponent($component, $overlay->getProps());
        }

        return $overlay->render($component);
    }

    public function renderOverlay(Overlay $overlay, OverlayComponent|string $component): OverlayResponse
    {
        if (is_string($component)) {
            $component = $this->buildComponent($component, $overlay->getProps());
        }

        return $overlay->render($component);
    }

    # ---------[ Overlay Builders ]----------

    public function buildNewOverlay(Request $request, array $props = []): Overlay
    {
        $id = $request->hasHeader(Header::OVERLAY_INITIALIZING)
            ? $request->header(Header::OVERLAY_ID)
            : Str::random(8);

        return $this->overlayBuilder
            ->setId($id)
            ->setUrl($request->fullUrl())
            ->setBaseUrl($request->header(Header::BASE_URL, url()->current()))
            ->setProps($props)
            ->setIsInitializing(true)
            ->build();
    }

    public function buildOverlayFromSession(Request $request, array $props = []): Overlay
    {
        $session = OverlaySession::loadFromRequest($request);

        return $this->overlayBuilder
            ->setId($session->meta('id'))
            ->setUrl($session->meta('url'))
            ->setBaseUrl($session->meta('baseUrl'))
            ->setProps([...$session->props(), ...$props])
            ->setIsInitializing(false)
            ->build();
    }

    # ---------[ Component ]----------

    public function buildComponentFromSession(Request $request): OverlayComponent
    {
        $session = OverlaySession::loadFromRequest($request);

        $componentName = $session->meta('componentClass');
        $props = $session->props();

        return $this->componentFactory->make($componentName, $props);
    }

    public function buildComponent(string $component, array $props = []): OverlayComponent
    {
        return $this->componentFactory->make($component, $props);
    }

    # ---------[ Helpers ]----------

    private function shouldCreateNewOverlay(Request $request): bool
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY)) {
            return true;
        }

        if (! OverlaySession::exists($request->header(Header::OVERLAY_ID))) {
            return true;
        }

        $from = parse_url($request->header(Header::OVERLAY_URL), PHP_URL_PATH);
        return ltrim($from, '/') !== ltrim($request->path(), '/');
    }

}