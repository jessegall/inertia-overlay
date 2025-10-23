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
        private array $props = [],
        private array $actions = [],
    ) {}

    public function toResponse($request): JsonResponse
    {
        $props = $this->prefixInstanceIdToPropKeys($this->props);

        if ($this->shouldHydrate()) {
            $this->addNonLazyPropsToPartialOnlyHeader($request, $props);
        }

        $response = $this->createInertiaResponse($request, $props);

        return $this->addOverlayDataToResponse($response);
    }

    private function prefixInstanceIdToPropKeys(array $props): array
    {
        $instanceId = $this->overlay->getInstanceId();

        return collect($props)
            ->mapWithKeys(fn($value, $key) => ["{$instanceId}:{$key}" => $value])
            ->all();
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

    private function addNonLazyPropsToPartialOnlyHeader(Request $request, array $props): void
    {
        $keys = collect($props)
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

    private function createInertiaResponse(Request $request, array $props): JsonResponse
    {
        return Inertia::render($this->overlay->getPageComponent(), $props)->toResponse($request);
    }

    private function addOverlayDataToResponse(JsonResponse $response): JsonResponse
    {
        $data = $response->getData(true);

        $data['overlay'] = [
            'id' => $this->overlay->getId(),
            'component' => $this->overlay->typename,
            'variant' => $this->config->variant,
            'size' => $this->config->size,
            'flags' => $this->config->flags,
            'keys' => array_keys($this->props),
            'actions' => array_keys($this->actions),
        ];

        return $response->setData($data);
    }

}