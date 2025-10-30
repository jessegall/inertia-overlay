<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as IlluminateResponse;
use Illuminate\Support\Facades\Route;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Inertia\Support\Header as InertiaHeader;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Header as OverlayHeader;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

readonly class OverlayResponse implements Responsable
{

    public function __construct(
        protected Overlay $overlay,
        protected OverlayComponent $component,
        protected OverlayConfig $config = new OverlayConfig(),
    ) {}

    public function resolveOverlayProperties(Overlay $overlay): array
    {
        return collect()
            ->merge($overlay->getProps())
            ->merge($this->component->props($this->overlay))
            ->mapWithKeys(fn($prop, $key) => [$this->overlay->scopePropKey($key) => $prop])
            ->all();
    }

    public function resolveRootPageData(Request $request, string $url): array
    {
        $rootPageRequest = Request::create($url);

        $response = Route::getRoutes()->match($rootPageRequest)->run();

        if (! $response instanceof InertiaResponse) {
            throw new RuntimeException('The base URL must return an Inertia response.');
        }

        $extractor = fn() => [$this->component, $this->props];

        return $extractor->call($response);
    }


    public function resolveResponseData(Request $request, string $rootUrl, bool $includeRootPage): array
    {
        $overlayProps = $this->resolveOverlayProperties($this->overlay);

        if ($includeRootPage) {
            [$pageComponent, $pageProps] = $this->resolveRootPageData($request, $rootUrl);
            return [$pageComponent, array_merge($pageProps, $overlayProps)];
        }

        $pageComponent = $request->header(OverlayHeader::PAGE_COMPONENT);
        return [$pageComponent, $overlayProps];
    }

    public function toResponse($request)
    {
        $baseUrl = $request->header(OverlayHeader::OVERLAY_BASE_URL, $this->overlay->getBaseUrl());

        [$pageComponent, $props] = $this->resolveResponseData(
            $request,
            $baseUrl,
            includeRootPage: ! $request->inertia() || count($this->overlay->getReloadPageProps()) > 0
        );

        if ($this->overlay->isOpening()) {
            $this->removePartialDataHeaders($request);
        } else {
            $this->configurePartialDataHeaders($request, $pageComponent);
        }

        $response = Inertia::render($pageComponent, $props)->toResponse($request);

        return $this->toOverlayResponse($response,
            [
                'id' => $this->overlay->getId(),
                'url' => $request->fullUrl(),
                'component' => $this->component->name(),
                'props' => array_keys($props),
                'config' => $this->config->toArray(),
                'input' => array_keys($this->overlay->getProps()),
                'baseUrl' => $baseUrl,
                'method' => $request->method(),

                'closeRequested' => $this->overlay->isCloseRequested(),
            ]
        );
    }

    protected function removePartialDataHeaders(Request $request): void
    {
        $request->headers->remove(InertiaHeader::PARTIAL_COMPONENT);
        $request->headers->remove(InertiaHeader::PARTIAL_ONLY);
    }

    protected function configurePartialDataHeaders(Request $request, string $pageComponent): void
    {
        $partial = collect(explode(',', $request->header(InertiaHeader::PARTIAL_ONLY, '')))
            ->merge($this->overlay->getReloadProps())
            ->map($this->overlay->scopePropKey(...))
            ->merge($this->overlay->getReloadPageProps())
            ->join(',');

        $request->headers->set(InertiaHeader::PARTIAL_COMPONENT, $pageComponent);
        $request->headers->set(InertiaHeader::PARTIAL_ONLY, $partial);
    }

    protected function toOverlayResponse(Response $response, array $data): IlluminateResponse|JsonResponse|Response
    {
        if ($response instanceof IlluminateResponse) {
            return $this->toViewResponse($response, $data);
        }

        if ($response instanceof JsonResponse) {
            return $this->toJsonResponse($response, $data);
        }

        return $response;
    }

    protected function toViewResponse(IlluminateResponse $response, array $data): IlluminateResponse
    {
        if (! $response->getOriginalContent() instanceof View) {
            return $response;
        }

        $content = $response->getContent();

        if (preg_match('/data-page="([^"]+)"/', $content, $matches)) {
            $pageData = json_decode(html_entity_decode($matches[1]), true);
            $pageData['overlay'] = $data;

            $newContent = str_replace(
                $matches[0],
                'data-page="' . htmlspecialchars(json_encode($pageData), ENT_QUOTES) . '"',
                $content
            );

            $response->setContent($newContent);
        }

        return $response;
    }

    protected function toJsonResponse(JsonResponse $response, array $data): JsonResponse
    {
        return $response->setData(
            [
                ...$response->getData(true),
                'overlay' => $data,
            ]
        );
    }

}