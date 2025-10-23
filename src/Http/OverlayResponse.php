<?php

namespace JesseGall\InertiaOverlay\Http;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\DeferProp;
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


    private function shouldRefresh(): bool
    {
        if ($this->overlay->isRefreshRequested()) {
            return true;
        }

        if ($this->overlay->hasState(OverlayState::OPENING)) {
            return $this->overlay->hasRequestCounter(1);
        }

        if ($this->overlay->isRefocusing()) {
            return ! $this->config->hasFlag(OverlayFlag::SKIP_HYDRATION_ON_REFOCUS);
        }

        return false;
    }

    private function scopeKey(string $key): string
    {
        return "{$this->overlay->getInstanceId()}:{$key}";
    }

    private function addPropsToPartialOnlyHeader(Request $request, array $keys): void
    {
        $only = str($request->header(Header::PARTIAL_ONLY, ''))
            ->explode(',')
            ->merge($keys)
            ->unique()
            ->join(',');

        $request->headers->set(Header::PARTIAL_ONLY, $only);
    }

    private function resolveRefreshProps(array $props): array
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

            if ($value instanceof IgnoreFirstLoad) {
                unset($propsToRefresh[$index]);
            }
        }

        return $propsToRefresh;
    }

    private function resolveDeferredProps()
    {
        return collect($this->props)
            ->filter(fn($value) => $value instanceof DeferProp)
            ->keys()
            ->map(fn($value) => $this->scopeKey($value))
            ->all();
    }

    private function addOverlayDataToResponse(JsonResponse $response): JsonResponse
    {
        $data = $response->getData(true);

        if ($this->overlay->hasRequestCounter(1)) {
            $deferredProps = $this->resolveDeferredProps();

            if ($deferredProps) {
                $data['deferredProps']['default'] = $deferredProps;
            }
        }

        $data['overlay'] = [
            'id' => $this->overlay->getId(),
            'variant' => $this->config->variant,
            'size' => $this->config->size,
            'flags' => $this->config->flags,
            'props' => array_keys($this->props),
            'actions' => array_keys($this->actions),
        ];

        return $response->setData($data);
    }

    public function toResponse($request): JsonResponse
    {
        sleep(1);

        $scopedProps = collect($this->props)
            ->mapWithKeys(fn($value, $key) => [$this->scopeKey($key) => $value])
            ->all();

        if ($this->shouldRefresh()) {
            $this->addPropsToPartialOnlyHeader($request, $this->resolveRefreshProps($scopedProps));
        }

        $response = Inertia::render($this->overlay->getPageComponent(), $scopedProps)->toResponse($request);
        $response = $this->addOverlayDataToResponse($response);

        $this->overlay->reset();

        return $response;
    }

}