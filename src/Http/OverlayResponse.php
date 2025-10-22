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
use JesseGall\InertiaOverlay\OverlayFlags;
use JesseGall\InertiaOverlay\OverlayState;

readonly class OverlayResponse implements Responsable
{

    public OverlayComponent $component;
    public OverlayFlags $flags;
    public array $props;

    public function __construct(
        private Overlay $overlay,
    )
    {
        $this->component = $this->overlay->resolveComponent();
        $this->flags = new OverlayFlags($this->component);
        $this->props = $this->resolveProps();
    }

    public function toResponse($request): JsonResponse
    {
        if ($this->shouldHydrate()) {
            $this->addNonLazyPropsToPartialOnlyHeader($request);
        }

        $response = $this->createInertiaResponse($request);

        return $this->injectOverlayDataInResponse($response);
    }

    # ----------[ Internal ]----------

    private function resolveProps(): array
    {
        $props = $this->component->props();

        if ($props instanceof Arrayable) {
            return $props->toArray();
        } else {
            return $props;
        }
    }

    private function shouldHydrate(): bool
    {
        if ($this->overlay->hasState(OverlayState::OPENING)) {
            return true;
        }

        if ($this->overlay->isRedirected()) {
            return true;
        }

        if ($this->overlay->isBlurred() && ! $this->flags->skipHydrationOnRefocus()) {
            return true;
        }

        return false;
    }

    private function addNonLazyPropsToPartialOnlyHeader(Request $request): void
    {
        $keys = collect($this->props)
            ->reject(fn($value) => $value instanceof IgnoreFirstLoad)
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
        $data = $response->getData(true);

        $data['overlay'] = [
            'id' => $this->overlay->getId(),
            'component' => $this->overlay->typename,
            'variant' => $this->component->variant(),
            'size' => $this->component->size(),
            'props' => array_keys($this->props),
            'flags' => [
                'skipHydrationOnRefocus' => $this->flags->skipHydrationOnRefocus(),
            ]
        ];

        return $response->setData($data);
    }

}