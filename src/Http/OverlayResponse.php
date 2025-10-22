<?php

namespace JesseGall\InertiaOverlay\Http;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\IgnoreFirstLoad;
use Inertia\Inertia;
use Inertia\Support\Header;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayComponent;
use JesseGall\InertiaOverlay\OverlayRegistrar;
use JesseGall\InertiaOverlay\OverlaySize;
use JesseGall\InertiaOverlay\OverlayState;
use JesseGall\InertiaOverlay\OverlayVariant;

readonly class OverlayResponse implements Responsable
{

    private OverlayVariant $variant;
    private OverlaySize $size;
    private array $props;

    public function __construct(
        private Overlay $overlay,
    )
    {
        $component = $this->makeComponent();

        $this->variant = $component->variant();
        $this->size = $component->size();

        $props = $component->props();

        if ($props instanceof Arrayable) {
            $this->props = $props->toArray();
        } else {
            $this->props = $props;
        }
    }

    public function toResponse($request): JsonResponse
    {
        if ($this->overlay->hasState(OverlayState::OPENING)) {
            $this->addNonLazyPropsToPartialOnlyHeader($request);
        }

        $response = $this->createInertiaResponse($request);

        return $this->injectOverlayDataInResponse($response);
    }

    # ----------[ Internal ]----------

    private function makeComponent(): OverlayComponent
    {
        $class = app(OverlayRegistrar::class)
            ->resolveComponentClass($this->overlay->component);

        if (is_subclass_of($class, 'Spatie\\LaravelData\\Data')) {
            return $class::from($this->overlay->arguments);
        }

        return app($class, $this->overlay->arguments);
    }

    private function addNonLazyPropsToPartialOnlyHeader(Request $request): void
    {
        $keys = collect($this->props)
            ->filter(fn($value) => ! $value instanceof IgnoreFirstLoad)
            ->keys()
            ->all();

        $only = str($request->header(Header::PARTIAL_ONLY, ''))
            ->explode(',')
            ->merge($keys)
            ->unique()
            ->join(',');

        $request->headers->set(Header::PARTIAL_ONLY, $only);
    }

    private function createInertiaResponse(Request $request): JsonResponse
    {
        return Inertia::render($this->overlay->getPageComponent(), $this->props)->toResponse($request);
    }

    private function injectOverlayDataInResponse(JsonResponse $response): JsonResponse
    {
        return $response->setData(
            [

                ...$response->getData(true),

                'overlay' => [
                    'id' => $this->overlay->getId(),
                    'component' => $this->overlay->component,
                    'variant' => $this->variant,
                    'size' => $this->size,
                    'props' => array_keys($this->props),
                ],

            ]
        );
    }

}