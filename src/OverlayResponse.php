<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Inertia\AlwaysProp;
use Inertia\DeferProp;
use Inertia\IgnoreFirstLoad;
use Inertia\Inertia;
use Inertia\Support\Header as InertiaHeader;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Contracts\SkipReloadOnRefocus;

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

    private function getDeferredPropKeys(): array
    {
        return collect($this->props)
            ->filter(fn($value) => $value instanceof DeferProp)
            ->keys()
            ->all();
    }

    private function resolveAlwaysPropKeys(): array
    {
        return collect($this->props)
            ->filter(fn($value) => $value instanceof AlwaysProp)
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

    private function resolvePartialPropKeys(): array
    {
        return collect($this->overlay->getPartialPropKeys())
            ->map(fn($value) => $this->overlay->unscopedKey($value))
            ->all();
    }

    private function resolveLifecyclePropKeys(): array
    {
        $keys = array_keys($this->props);

        if ($this->overlay->isOpening()) {
            return collect($keys)
                ->reject(fn($key) => in_array($key, $this->getLazyPropKeys()))
                ->all();
        }

        if ($this->overlay->isDeferredLoading()) {
            return collect($keys)
                ->filter(fn($key) => in_array($key, $this->getDeferredPropKeys()))
                ->all();
        }

        if ($this->overlay->isRefocusing()) {
            if ($this->instanceOf(SkipReloadOnRefocus::class)) {
                return [];
            }

            return collect($keys)
                ->reject(fn($key) => in_array($key, $this->getLazyPropKeys()))
                ->all();
        }

        return [];
    }

    private function resolveProps(): array
    {
        $keys = collect()
            ->merge($this->resolveAlwaysPropKeys())
            ->merge($this->resolvePartialPropKeys())
            ->merge($this->resolveLifecyclePropKeys())
            ->unique()
            ->values()
            ->all();

        return collect($this->props)
            ->only($keys)
            ->mapWithKeys(fn($value, $key) => [$this->overlay->scopedKey($key) => $value])
            ->all();
    }

    private function addOverlayDataToResponse(JsonResponse $response): JsonResponse
    {
        $data = $response->getData(true);

        $data['overlay'] = [
            'id' => $this->overlay->id,
            'url' => $this->overlay->getUrl(),
            'component' => $this->component->name(),
            'variant' => $this->config->variant,
            'size' => $this->config->size,
            'props' => array_keys($this->props),
            'deferredProps' => $this->getDeferredPropKeys(),
            'closeRequested' => $this->overlay->closeRequested(),
            'type' => 'hidden',
        ];

        return $response->setData($data);
    }

    public function toResponse($request): JsonResponse
    {
        $props = $this->resolveProps();
        $pageComponent = $this->overlay->getPageComponent();

        $request->headers->set(InertiaHeader::PARTIAL_COMPONENT, $pageComponent);
        $request->headers->set(InertiaHeader::PARTIAL_ONLY, implode(',', array_keys($props)));

        $response = Inertia::render($pageComponent, $props)->toResponse($request);
        $response = $this->addOverlayDataToResponse($response);

        return $response;
    }

    # ----------[ Helpers ]----------

    private function instanceOf(string $class): bool
    {
        $target = $this->component instanceof OverlayComponentDecorator ?
            $this->component->getWrappedComponent() :
            $this->component;

        return is_subclass_of($target, $class);
    }


}