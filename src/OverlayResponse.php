<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Support\Header;
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

    public function toResponse($request): JsonResponse
    {
        $props = collect($this->props)
            ->mapWithKeys(fn($prop, $key) => [$this->overlay->scopedKey($key) => $prop])
            ->all();

        $pageComponent = $this->overlay->getPageComponent();

        if ($this->overlay->isOpening()) {
            $request->headers->remove(Header::PARTIAL_COMPONENT);
            $request->headers->remove(Header::PARTIAL_ONLY);
        } else {
            $request->headers->set(Header::PARTIAL_COMPONENT, $pageComponent);

            if ($this->overlay->isRefocusing() && $this->instanceOf(SkipReloadOnRefocus::class)) {
                $partial = '__dummy__';
            } else {
                $partial = collect()
                    ->merge($this->overlay->getPartialProps())
                    ->merge($this->overlay->getRefreshProps())
                    ->map($this->overlay->scopedKey(...))
                    ->join(',');
            }

            $request->headers->set(Header::PARTIAL_ONLY, $partial);
        }

        $response = Inertia::render($pageComponent, $props)->toResponse($request);

        return $this->transformResponse($response);
    }

    private function transformResponse(JsonResponse $response): JsonResponse
    {
        $data = $response->getData(true);

        $data['overlay'] = [
            'id' => $this->overlay->id,
            'url' => $this->overlay->getUrl(),
            'component' => $this->component->name(),
            'props' => array_keys($this->props),
            'config' => $this->config->toArray(),
            'closeRequested' => $this->overlay->closeRequested(),
        ];

        unset($data['props']['__dummy__']);

        return $response->setData($data);
    }

    private function instanceOf(string $class): bool
    {
        $target = $this->component instanceof OverlayComponentDecorator ?
            $this->component->getWrappedComponent() :
            $this->component;

        return is_subclass_of($target, $class);
    }


}