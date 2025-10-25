<?php

namespace JesseGall\InertiaOverlay\Http;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\DeferProp;
use Inertia\IgnoreFirstLoad;
use Inertia\Inertia;
use Inertia\Support\Header as InertiaHeader;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlayFlag;
use JesseGall\InertiaOverlay\Enums\OverlayState;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayConfig;

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

        if ($this->overlay->hasState(OverlayState::OPENING) && $this->overlay->hasRequestCounter(1)) {
            $this->overlay->refresh();
        }

        if ($this->overlay->isRefocusing() && $this->overlay->hasRequestCounter(1) && ! $this->config->hasFlag(OverlayFlag::SKIP_HYDRATION_ON_REFOCUS)) {
            $this->overlay->refresh();
        }
    }

    private function scopeKey(string $key): string
    {
        return "{$this->overlay->id}:{$key}";
    }

    private function resolveRefreshProps(Request $request, array $props): array
    {
        $propsToRefresh = $this->overlay->getRefreshProps();

        if ($propsToRefresh === true) {
            $propsToRefresh = array_keys($props);
        } else {
            $propsToRefresh = collect($propsToRefresh)
                ->map(fn($key) => $this->scopeKey($key))
                ->all();
        }

        foreach ($propsToRefresh as $index => $prop) {
            $value = $props[$prop] ?? null;

            if ($value === null || $value instanceof IgnoreFirstLoad) {
                unset($propsToRefresh[$index]);
            }
        }

        return str($request->header(InertiaHeader::PARTIAL_ONLY, ''))
            ->explode(',')
            ->merge($propsToRefresh)
            ->unique()
            ->all();
    }

    private function addOverlayDataToResponse(JsonResponse $response): JsonResponse
    {
        $data = $response->getData(true);

        if ($this->overlay->hasRequestCounter(1)) {
            $deferredProps = collect($this->props)
                ->filter(fn($value) => $value instanceof DeferProp)
                ->keys()
                ->map(fn($value) => $this->scopeKey($value))
                ->all();

            if ($deferredProps) {
                $data['deferredProps']['default'] = $deferredProps;
            }
        }

        $data['overlay'] = [
            'id' => $this->overlay->id,
            'url' => $this->overlay->url,
            'component' => $this->component->name(),
            'variant' => $this->config->variant,
            'size' => $this->config->size,
            'flags' => $this->config->flags,
            'props' => array_keys($this->props),
            'closeRequested' => $this->overlay->closeRequested(),
            'data' => $this->overlay->data,
        ];

        return $response->setData($data);
    }

    public function toResponse($request): JsonResponse
    {
        $props = collect($this->props)
            ->merge($this->overlay->getAppendProps())
            ->mapWithKeys(fn($value, $key) => [$this->scopeKey($key) => $value])
            ->all();

        $refreshProps = $this->resolveRefreshProps($request, $props);
        $request->headers->set(InertiaHeader::PARTIAL_ONLY, implode(',', $refreshProps));

        $response = Inertia::render($this->overlay->getPageComponent(), $props)->toResponse($request);
        $response = $this->addOverlayDataToResponse($response);

        $this->overlay->reset();

        return $response;
    }

}