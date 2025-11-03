<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

readonly class OverlayResponseFactory
{

    private array $resolved;

    public function __construct(
        protected ComponentRegistry $componentRegistrar,
        protected ComponentFactory $componentFactory,
    ) {}

    /**
     * Build an overlay with custom options.
     *
     * Use this method when you need to configure overlay-specific options before rendering.
     *
     * @param (Closure(OverlayBuilder $builder, Request $request): (OverlayBuilder|OverlayRenderer)) | null $apply
     * @return OverlayBuilder|HigherOrderBuildProxy|OverlayRenderer|OverlayResponse
     */
    public function build(Closure|null $apply = null): OverlayBuilder|HigherOrderBuildProxy|OverlayRenderer|OverlayResponse
    {
        $builder = OverlayBuilder::new();
        $request = request();

        if (is_null($apply)) {
            return new HigherOrderBuildProxy($builder, $this->build(...));
        }

        return $apply($builder, $request);
    }

    public function render(OverlayComponent|string $component, array $props = []): OverlayRenderer|OverlayResponse|HigherOrderBuildProxy
    {
        return $this
            ->build($this->buildFreshOverlay())
            ->setProps($props)
            ->render($component);
    }

    # ---------[ Factory ]----------

    public function buildFreshOverlay(): Closure
    {
        return function (OverlayBuilder $builder, Request $request) {

            return $builder
                ->setUrl($request->fullUrl())
                ->setBaseUrl($request->header(Header::BASE_URL) ?? $request->header('referer'));

        };
    }

    # ----------[ Helpers ]----------

    public function shouldLoadFromStorage(Request $request, string $overlayId): bool
    {
        if (! OverlaySession::exists($overlayId)) {
            return false;
        }

        if (array_key_exists($overlayId, $this->resolved)) {
            return false;
        }

        return true;
    }

}