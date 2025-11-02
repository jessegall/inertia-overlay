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
        protected ComponentRegistry $componentRegistrar,
        protected ComponentFactory $componentFactory,
    ) {}

    /**
     * Build an overlay with custom options
     *
     * Use this method when you need to configure overlay-specific options before rendering.
     *
     * Note: Overlays with an already existing session will be loaded from the session instead of creating a new one.
     *
     * @param (Closure(OverlayBuilder): (OverlayBuilder|OverlayResponse|Overlay)) | null $factory
     * @return OverlayResponse|HigherOrderBuildProxy
     */
    public function build(Closure|null $factory = null): OverlayResponse|HigherOrderBuildProxy
    {
        $builder = $this->makeBuilder();

        if (is_null($factory)) {
            return new HigherOrderBuildProxy($builder, $this->build(...));
        }

        $request = request();

        if ($this->shouldCreateNewOverlay($request)) {
            $result = $factory($builder);
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

        return $this->renderOverlay($overlay, $component);
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

        return $this->makeBuilder()
            ->setId($id)
            ->setUrl($request->fullUrl())
            ->setBaseUrl($request->header(Header::BASE_URL, url()->current()))
            ->setProps($props)
            ->setInitializing(true)
            ->build();
    }

    public function buildOverlayFromSession(Request $request, array $props = []): Overlay
    {
        $session = OverlaySession::loadFromRequest($request);

        return $this->makeBuilder()
            ->setId($session->meta('id'))
            ->setUrl($session->meta('url'))
            ->setBaseUrl($session->meta('baseUrl'))
            ->setProps([...$session->props(), ...$props])
            ->setInitializing(false)
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
        if (class_exists($component) || $this->componentRegistrar->isAliasRegistered($component)) {
            return $this->componentFactory->make($component, $props);
        }

        return new PageOverlayComponent($component, $props);
    }

    # ---------[ Helpers ]----------

    private function makeBuilder(): OverlayBuilder
    {
        return app(OverlayBuilder::class);
    }

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