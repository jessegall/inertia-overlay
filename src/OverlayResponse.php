<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\DeferProp;
use Inertia\IgnoreFirstLoad;
use Inertia\Inertia;
use Inertia\Support\Header as InertiaHeader;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlayFlag;

readonly class OverlayResponse implements Responsable
{

    private OverlayConfig $config;
    private array $props;

    public function __construct(
        private Overlay $overlay,
        private OverlayComponent $component,
    )
    {
        $this->config = $this->component->config($this->overlay);
        $this->props = $this->component->props($this->overlay);
    }

    private function scopeKey(string $key): string
    {
        return "{$this->overlay->id}:{$key}";
    }

    private function unscopeKey(string $scopedKey): string
    {
        return str_replace("{$this->overlay->id}:", '', $scopedKey);
    }

    private function getRefreshPropKeys(): array
    {
        $keys = $this->overlay->getRefreshProps();

        if ($keys === true) {
            return array_keys($this->props);
        }

        return array_values($keys ?: []);
    }

    private function getDeferredPropKeys(): array
    {
        return collect($this->props)
            ->filter(fn($value) => $value instanceof DeferProp)
            ->keys()
            ->all();
    }

    private function getLazyPropKeys(): array
    {
        return collect($this->props)
            ->filter(fn($value) => $value instanceof IgnoreFirstLoad)
            ->keys()
            ->all();
    }

    private function getPartialPropKeys(): array
    {
        return collect($this->overlay->getPartialProps())
            ->map(fn($value) => $this->unscopeKey($value))
            ->all();
    }

    private function resolvePropKeys(Request $request): array
    {
        $keys = array_keys($this->props);

        if ($this->overlay->isOpening()) {
            return collect($keys)
                ->reject(fn($key) => in_array($key, $this->getLazyPropKeys()))
                ->all();
        }

        if ($this->overlay->isLoadingDeferred()) {
            return collect($keys)
                ->filter(fn($key) => in_array($key, $this->getDeferredPropKeys()))
                ->all();
        }

        if ($this->overlay->isRefocusing()) {
            if ($this->config->hasFlag(OverlayFlag::SKIP_REFRESH_ON_REFOCUS)) {
                return [];
            }

            return collect($keys)
                ->reject(fn($key) => in_array($key, $this->getLazyPropKeys()))
                ->all();
        }

        return [
            ...$this->getRefreshPropKeys(),
            ...$this->getPartialPropKeys(),
        ];
    }

    private function resolveProps(Request $request): array
    {
        $keys = collect($this->resolvePropKeys($request))
            ->map(fn($key) => $this->unscopeKey($key))
            ->values()
            ->all();

        return collect($this->props)
            ->only($keys)
            ->merge($this->overlay->getAppendProps())
            ->mapWithKeys(fn($value, $key) => [$this->scopeKey($key) => $value])
            ->all();
    }

    private function addOverlayDataToResponse(JsonResponse $response): JsonResponse
    {
        $data = $response->getData(true);

        $data['overlay'] = [
            'id' => $this->overlay->id,
            'url' => $this->overlay->url,
            'instance' => $this->overlay->getInstanceKey(),
            'component' => $this->component->name(),
            'variant' => $this->config->variant,
            'size' => $this->config->size,
            'flags' => $this->config->flags,
            'props' => array_keys($this->props),
            'deferredProps' => $this->getDeferredPropKeys(),
            'closeRequested' => $this->overlay->closeRequested(),
            'type' => $this->overlay->type,
        ];

        return $response->setData($data);
    }

    public function toResponse($request): JsonResponse
    {
        $props = $this->resolveProps($request);
        $pageComponent = $this->overlay->getPageComponent();

        $request->headers->set(InertiaHeader::PARTIAL_COMPONENT, $pageComponent);
        $request->headers->set(InertiaHeader::PARTIAL_ONLY, implode(',', array_keys($props)));

        $response = Inertia::render($pageComponent, $props)->toResponse($request);
        $response = $this->addOverlayDataToResponse($response);

        $this->overlay->reset();

        return $response;
    }

}