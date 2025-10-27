<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Support\Header;
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

    public function toResponse($request): JsonResponse
    {
        $props = $this->props;
        $pageComponent = $this->overlay->getPageComponent();

        if ($this->overlay->isOpening()) {
            $request->headers->remove(Header::PARTIAL_COMPONENT);
            $request->headers->remove(Header::PARTIAL_ONLY);
        } else {
            $request->headers->set(Header::PARTIAL_COMPONENT, $pageComponent);

            $partial = array_merge(
                $this->overlay->getPartialProps(),
                $this->overlay->getRefreshProps()
            );

            if ($this->overlay->isRefocusing() && $this->instanceOf(SkipReloadOnRefocus::class)) {
                $partial = ['__dummy__'];
            }

            $request->headers->set(InertiaHeader::PARTIAL_ONLY, implode(',', $partial));
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
            'variant' => $this->config->variant,
            'size' => $this->config->size,
            'props' => array_keys($this->props),
            'closeRequested' => $this->overlay->closeRequested(),
            'type' => 'hidden',
        ];

        $data['props'] = collect($data['props'])
            ->reject(fn($_, $key) => $key === '__dummy__')
            ->pipe($this->scopeProps(...));

        if (isset($data['deferredProps'])) {
            $data['deferredProps'] = $this->scopeProps($data['deferredProps']);
        }

        return $response->setData($data);
    }

    private function instanceOf(string $class): bool
    {
        $target = $this->component instanceof OverlayComponentDecorator ?
            $this->component->getWrappedComponent() :
            $this->component;

        return is_subclass_of($target, $class);
    }

    private function scopeProps(Collection|array $props): array
    {
        return collect($props)
            ->mapWithKeys(fn($prop, $key) => [$this->overlay->scopedKey($key) => $prop])
            ->all();
    }


}