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
     * @param (Closure(OverlayBuilder $builder, Request $request): (OverlayBuilder)) | null $apply
     * @return OverlayBuilder|HigherOrderBuildProxy|OverlayResponse
     */
    public function build(Closure|null $apply = null): OverlayBuilder|HigherOrderBuildProxy|OverlayResponse
    {
        $builder = OverlayBuilder::new();
        $request = request();

        if (is_null($apply)) {
            return new HigherOrderBuildProxy($builder, $this->build(...));
        }

        return $apply($builder, $request);
    }

    public function render(OverlayComponent|string $component, array $props = []): OverlayResponse
    {
        return $this
            ->build($this->buildFreshOverlay())
            ->setComponent($component)
            ->setProps($props)
            ->render();
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

}