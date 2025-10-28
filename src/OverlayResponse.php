<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Support\Header;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

readonly class OverlayResponse implements Responsable
{

    private OverlayConfig $config;

    public function __construct(
        private Overlay $overlay,
        private OverlayComponent $component,
    )
    {
        $this->config = $this->component->config($this->overlay);
    }

    public function toResponse($request)
    {
        if ($request->method() !== 'GET') {
            return InertiaOverlay::redirect($this->overlay->getComponent(), $this->overlay->getProps());
        }

        $props = $this->resolveProperties();
        $pageComponent = $this->overlay->getPageComponent();

        if ($this->overlay->isOpening()) {
            $request->headers->remove(Header::PARTIAL_COMPONENT);
            $request->headers->remove(Header::PARTIAL_ONLY);
        } else {
            $request->headers->set(Header::PARTIAL_COMPONENT, $pageComponent);
            $request->headers->set(Header::PARTIAL_ONLY, implode(',', $this->resolvePartialPropertyKeys($request)));
        }

        $response = Inertia::render($pageComponent, $props)->toResponse($request);

        return $this->withOverlay($response,
            [
                'id' => $this->overlay->getId(),
                'url' => $request->fullUrl(),
                'component' => $this->component->name(),
                'props' => array_keys($props),
                'config' => $this->config->toArray(),
                'closeRequested' => $this->overlay->closeRequested(),
            ]
        );
    }

    private function resolveProperties()
    {
        return collect()
            ->merge($this->overlay->getProps())
            ->merge($this->component->props($this->overlay))
            ->mapWithKeys(fn($prop, $key) => [$this->overlay->scopePropKey($key) => $prop])
            ->all();
    }

    private function resolvePartialPropertyKeys(Request $request): array
    {
        $partial = $request->header(Header::PARTIAL_ONLY, '');

        return collect()
            ->merge(explode(',', $partial))
            ->merge($this->overlay->getRefreshProps())
            ->map($this->overlay->scopePropKey(...))
            ->all();
    }

    private function withOverlay(JsonResponse $response, array $data): JsonResponse
    {
        $original = $response->getData(true);
        $original['overlay'] = $data;
        return $response->setData($original);
    }

}