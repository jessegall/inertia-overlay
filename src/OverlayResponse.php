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

        if ($this->shouldSaveToSession($request)) {
            $this->overlay->saveToSession($this->component);
        }

        return $this->attachOverlayMetadata($response, $request, $baseUrl);
    }

    private function resolveBaseUrl(Request $request): string
    {
        return $request->header(OverlayHeader::BASE_URL, $this->overlay->getBaseUrl());
    }


    private function buildResponse(Request $request, string $baseUrl): Response|JsonResponse
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

    private function buildInitialResponse(Request $request, string $baseUrl): Response
    {
        $pageResponse = $this->fetchPageResponse($request, $baseUrl);
        $overlayResponse = $this->buildOverlayResponse($request, $this->component->name());

        $merged = $this->mergeDeep($pageResponse->original->getData(true), $overlayResponse->original->getData());

        $pageResponse->__data = $merged;

        return $pageResponse;
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

    private function fetchPageResponse(Request $request, string $url): Response|JsonResponse
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
        return collect($this->overlay->getInitialProps())
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

    private function shouldSaveToSession(Request $request): bool
    {
        return ! $request->hasHeader(OverlayHeader::OVERLAY_ACTION)
            || $request->header(OverlayHeader::OVERLAY_ID) != $this->overlay->getId();
    }

    private function resolveOverlayUrl(Request $request): string
    {
        if ($request->header(OverlayHeader::OVERLAY_ACTION)) {
            return route('inertia-overlay.overlay', [
                ...$this->overlay->getInitialProps(),
                'type' => $request->header(OverlayHeader::OVERLAY_COMPONENT)
            ]);
        }

        return $request->fullUrl();
    }

    private function attachOverlayMetadata(Response $response, Request $request, string $baseUrl): Response
    {
        $url = $this->resolveOverlayUrl($request);

        $metadata = [
            'id' => $this->overlay->getId(),
            'url' => $url,
            'component' => $this->component->name(),
            'config' => $this->config->toArray(),
            'baseUrl' => $baseUrl,
            'method' => $request->method(),
            'closeRequested' => $this->overlay->isCloseRequested(),
        ];

        return match (true) {
            $response instanceof JsonResponse => $this->attachToJson($response, $metadata),
            $response instanceof IlluminateResponse => $this->attachToView($response, $metadata),
            default => $response
        };
    }

    private function attachToJson(JsonResponse $response, array $metadata): JsonResponse
    {
        return $response->setData([
            ...$response->getData(true),
            'overlay' => $metadata,
        ]);
    }

    private function attachToView(IlluminateResponse $response, array $metadata): IlluminateResponse
    {
        if (! $response->getOriginalContent() instanceof View) {
            return $response;
        }

        $content = $response->getContent();

        if (! preg_match('/data-page="([^"]*)"/', $content, $matches)) {
            return $response;
        }

        $pageData = $response->__data['page'] ?? [];
        $pageData['overlay'] = $metadata;

        $newPageJson = htmlspecialchars(json_encode($pageData), ENT_QUOTES, 'UTF-8');
        $content = str_replace($matches[0], 'data-page="' . $newPageJson . '"', $content);

        return $response->setContent($content);
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