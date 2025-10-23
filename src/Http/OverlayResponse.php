<?php

namespace JesseGall\InertiaOverlay\Http;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\IgnoreFirstLoad;
use Inertia\Inertia;
use Inertia\Support\Header;
use JesseGall\InertiaOverlay\Enums\OverlayFlag;
use JesseGall\InertiaOverlay\Enums\OverlayState;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayConfig;

readonly class OverlayResponse implements Responsable
{

    public function __construct(
        private Overlay $overlay,
        private OverlayConfig $config,
        private array $props,
    ) {}

    public function toResponse($request): JsonResponse
    {
        if ($this->shouldHydrate()) {
            $this->addNonLazyPropsToPartialOnlyHeader($request);
        }

        $response = $this->createInertiaResponse($request);

        return $this->injectOverlayDataInResponse($response);
    }

    private function shouldHydrate(): bool
    {
        if ($this->overlay->hasState(OverlayState::OPENING)) {
            return true;
        }

        if ($this->overlay->isRedirected()) {
            return true;
        }

        if ($this->overlay->isBlurred() && ! $this->config->hasFlag(OverlayFlag::SKIP_HYDRATION_ON_REFOCUS)) {
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
            'variant' => $this->config->variant,
            'size' => $this->config->size,
            'flags' => $this->config->flags,
            'keys' => array_keys($this->props),
        ];

        return $response->setData($data);
    }

}