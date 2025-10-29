<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Inertia\Support\Header;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use ReflectionClass;

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
        $baseUrl = $this->overlay->getBaseUrl();

        if (! $pageComponent = $this->overlay->getPageComponent()) {
            $baseUrl = $this->overlay->getBaseUrl();
            [$pageComponent, $pageProps] = $this->renderBaseRoute($request, $baseUrl);
            $props = array_merge($pageProps, $props);
        }

        if ($this->overlay->isOpening()) {
            $request->headers->remove(Header::PARTIAL_COMPONENT);
            $request->headers->remove(Header::PARTIAL_ONLY);
        } else {
            $request->headers->set(Header::PARTIAL_COMPONENT, $pageComponent);
            $request->headers->set(Header::PARTIAL_ONLY, implode(',', $this->resolvePartialPropertyKeys($request)));
        }

        $response = Inertia::render($pageComponent, $props);

        return $this->withOverlay($response,
            [
                'id' => $this->overlay->getId(),
                'url' => $request->fullUrl(),
                'component' => $this->component->name(),
                'props' => array_keys($props),
                'config' => $this->config->toArray(),
                'closeRequested' => $this->overlay->closeRequested(),
                'input' => array_keys($this->overlay->getProps()),
                'baseUrl' => $baseUrl,
            ]
        );
    }

    private function renderBaseRoute(Request $request, string $baseUrl): array
    {
        $route = app('router')->getRoutes()->match(Request::create($baseUrl));

        /** @var Response $response */
        $response = app()->call([$route->getController(), $route->getActionMethod()]);
        $reflector = new ReflectionClass($response);
        $component = $reflector->getProperty('component')->getValue($response);
        $props = $reflector->getProperty('props')->getValue($response);

        return [$component, $props];
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

    private function withOverlay(Response $response, array $data)
    {
        $response = $response
            ->withViewData('overlay', $data)
            ->toResponse($this->overlay->request);

        if ($response instanceof JsonResponse) {
            $original = $response->getData(true);
            $original['overlay'] = $data;
            return $response->setData($original);
        }

        return $response;
    }

}