<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as IlluminateResponse;
use Illuminate\Support\Facades\Route;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Support\Header as InertiaHeader;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Header as OverlayHeader;
use Symfony\Component\HttpFoundation\Response;

readonly class OverlayResponse implements Responsable
{

    public function __construct(
        protected Overlay $overlay,
        protected OverlayComponent $component,
        protected OverlayConfig $config = new OverlayConfig(),
    ) {}

    public function toResponse($request)
    {
        $baseUrl = $this->resolveBaseUrl($request);

        $response = $this->buildResponse($request, $baseUrl);
        $metaData = $this->buildOverlayMetaData($request, $baseUrl);
        $pageData = $this->buildPageData($response, $metaData);

        $this->overlay->session()->setPage($pageData);
        $this->registerActions();

        return $this->attachPage($response, $pageData);
    }

    private function resolveBaseUrl(Request $request): string
    {
        return $request->header(OverlayHeader::BASE_URL, $this->overlay->getBaseUrl());
    }

    private function buildResponse(Request $request, string $baseUrl): InitialOverlayResponse|JsonResponse
    {
        if (! $request->hasHeader(InertiaHeader::INERTIA)) {
            return $this->buildInitialResponse($request, $baseUrl);
        }

        if ($this->overlay->isInitializing()) {
            $this->clearPartialHeaders($request);
        } else {
            $this->setPartialHeaders($request);
        }

        if ($this->shouldReloadPageProps()) {
            return $this->buildMergedResponse($request, $baseUrl);
        }

        return $this->buildOverlayOnlyResponse($request);
    }

    private function buildInitialResponse(Request $request, string $baseUrl): InitialOverlayResponse
    {
        $pageResponse = $this->fetchPageResponse($request, $baseUrl);
        $overlayResponse = $this->buildOverlayResponse($request, $this->component->name());

        $merged = $this->mergeDeep($pageResponse->original->getData(true), $overlayResponse->original->getData());

        return new InitialOverlayResponse($pageResponse, $merged);
    }

    private function buildMergedResponse(Request $request, string $baseUrl): JsonResponse
    {
        $pageComponent = $request->header(OverlayHeader::PAGE_COMPONENT);
        $pageResponse = $this->fetchPageResponse($request, $baseUrl);
        $overlayResponse = $this->buildOverlayResponse($request, $pageComponent);

        $merged = $this->mergeDeep($pageResponse->getData(true), $overlayResponse->getData(true));

        return $pageResponse->setData($merged);
    }

    private function buildOverlayOnlyResponse(Request $request): Response|JsonResponse
    {
        $pageComponent = $request->header(OverlayHeader::PAGE_COMPONENT);
        return $this->buildOverlayResponse($request, $pageComponent);
    }

    private function fetchPageResponse(Request $request, string $url): IlluminateResponse|JsonResponse
    {
        $isInertia = $request->hasHeader(InertiaHeader::INERTIA);
        $switcher = new ContextSwitcher($request, Request::create($url));

        return $switcher->switch(function (Request $request) use ($isInertia) {
            $response = Route::getRoutes()->match($request)->run();

            if ($isInertia) {
                $component = (fn() => $this->component)->call($response);
                $this->configureInertiaHeaders($request, $component);
            }

            return $response->toResponse($request);
        });
    }

    private function buildOverlayResponse(Request $request, string $component): Response|JsonResponse
    {
        $props = $this->buildScopedProps();
        return Inertia::render($component, $props)->toResponse($request);
    }

    private function buildScopedProps(): array
    {
        return collect($this->overlay->getProps())
            ->merge($this->component->props($this->overlay))
            ->mapWithKeys(fn($prop, $key) => [
                $this->overlay->scopePropKey($key) => $prop
            ])
            ->all();
    }

    private function clearPartialHeaders(Request $request): void
    {
        $request->headers->remove(InertiaHeader::PARTIAL_COMPONENT);
        $request->headers->remove(InertiaHeader::PARTIAL_ONLY);
    }

    private function setPartialHeaders(Request $request): void
    {
        $pageComponent = $request->header(OverlayHeader::PAGE_COMPONENT);

        $partial = collect(explode(',', $request->header(InertiaHeader::PARTIAL_ONLY, '')))
            ->merge($this->overlay->getOnly())
            ->map($this->overlay->scopePropKey(...))
            ->merge($this->overlay->getPageInclude())
            ->unique()
            ->join(',');

        $request->headers->set(InertiaHeader::PARTIAL_COMPONENT, $pageComponent);
        $request->headers->set(InertiaHeader::PARTIAL_ONLY, $partial);
    }

    private function configureInertiaHeaders(Request $request, string $component): void
    {
        $request->headers->set(InertiaHeader::INERTIA, 'true');
        $request->headers->set(InertiaHeader::PARTIAL_ONLY, $this->overlay->getPageInclude());
        $request->headers->set(InertiaHeader::PARTIAL_COMPONENT, $component);
    }

    private function shouldReloadPageProps(): bool
    {
        return count($this->overlay->getPageInclude()) > 0;
    }

    public function buildOverlayMetaData(Request $request, string $baseUrl): array
    {
        if ($request->header(OverlayHeader::OVERLAY_ACTION)) {
            $url = route('inertia-overlay.overlay', [
                ...$this->overlay->getProps(),
                'type' => $request->header(OverlayHeader::OVERLAY_COMPONENT)
            ]);
        } else {
            $url = $request->fullUrl();
        }

        return [
            'id' => $this->overlay->getId(),
            'url' => $url,
            'component' => $this->component->name(),
            'componentClass' => get_class($this->component),
            'config' => $this->config->toArray(),
            'baseUrl' => $baseUrl,
            'method' => $request->method(),
            'closeRequested' => $this->overlay->isCloseRequested(),
            'initialProps' => array_keys($this->overlay->getProps()),
        ];
    }

    public function buildPageData(InitialOverlayResponse|JsonResponse $response, array $metaData): array
    {
        $data = $response instanceof JsonResponse
            ? $response->getData(true)
            : $response->data;

        return [
            ...$data['page'] ?? $data,
            'overlay' => $metaData,
        ];
    }

    private function registerActions(): void
    {
        $actionRunner = app(OverlayActionRunner::class);
        $actionRunner->register($this->overlay, $this->component);
    }

    private function attachPage(InitialOverlayResponse|JsonResponse $response, array $page): Response
    {
        return match (true) {
            $response instanceof JsonResponse => $this->attachToJson($response, $page),
            $response instanceof InitialOverlayResponse => $this->attachToView($response, $page),
            default => $response
        };
    }

    private function attachToJson(JsonResponse $response, array $page): JsonResponse
    {
        return $response->setData($page);
    }

    private function attachToView(InitialOverlayResponse $response, array $page): IlluminateResponse
    {
        if (! $response->original->getOriginalContent() instanceof View) {
            return $response->original;
        }

        $content = $response->original->getContent();

        if (! preg_match('/data-page="([^"]*)"/', $content, $matches)) {
            return $response->original;
        }

        $newPageJson = htmlspecialchars(json_encode($page), ENT_QUOTES, 'UTF-8');
        $content = str_replace($matches[0], 'data-page="' . $newPageJson . '"', $content);

        return $response->original->setContent($content);
    }

    private function mergeDeep(array $a, array $b): array
    {
        foreach ($b as $key => $value) {
            if (! is_array($value) || ! isset($a[$key]) || ! is_array($a[$key])) {
                $a[$key] ??= $value;
                continue;
            }

            $bothArraysAreList = array_is_list($value) && array_is_list($a[$key]);

            if ($bothArraysAreList) {
                $a[$key] = array_unique(array_merge($a[$key], $value), SORT_REGULAR);
            } else {
                $a[$key] = $this->mergeDeep($a[$key], $value);
            }
        }

        return $a;
    }

}