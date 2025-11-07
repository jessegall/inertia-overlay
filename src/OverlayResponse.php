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

    private Overlay|null $parent;

    public function __construct(
        public Overlay $overlay,
        public OverlayComponent $component,
    )
    {
        if ($parentId = $this->overlay->parentId) {
            $this->parent = Overlay::load($parentId);
        } else {
            $this->parent = null;
        }
    }

    public function toResponse($request)
    {
        $response = $this->buildResponse($request);
        $metaData = $this->buildOverlayMetaData($request);
        $pageData = $this->buildPageData($response, $metaData);

        $this->registerActions();
        $this->overlay->session->save($pageData);

        return $this->attachPage($response, $pageData);
    }

    private function resolveBaseUrl(Request $request): string
    {
        return $request->header(OverlayHeader::BASE_URL, $this->overlay->getBaseUrl());
    }

    private function buildResponse(Request $request): InitialOverlayResponse|JsonResponse
    {
        $baseUrl = $this->resolveBaseUrl($request);

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
                $this->configureInertiaHeadersForPageRequest($request, $component);
            }

            return $response->toResponse($request);
        });
    }

    private function configureInertiaHeadersForPageRequest(Request $request, string $component): void
    {
        $request->headers->set(InertiaHeader::INERTIA, 'true');

        if ($this->shouldReloadAllPageProps()) {
            $request->headers->remove(InertiaHeader::PARTIAL_ONLY);
        } else {
            $request->headers->set(InertiaHeader::PARTIAL_ONLY, implode(',', $this->overlay->getReloadedPageKeys()));
        }

        $request->headers->set(InertiaHeader::PARTIAL_COMPONENT, $component);
    }

    private function buildOverlayResponse(Request $request, string $component): Response|JsonResponse
    {
        $props = $this->buildScopedProps();
        return Inertia::render($component, $props)->toResponse($request);
    }

    private function buildScopedProps(): array
    {
        $props = collect()
            ->merge($this->overlay->getProps())
            ->merge($this->overlay->getAppendedProps())
            ->merge($this->component->props($this->overlay))
            ->mapWithKeys(fn($prop, $key) => [
                $this->overlay->scopeKey($key) => $prop
            ])
            ->when($this->parent,
                fn($props) => $props->merge(
                    collect($this->parent->getProps())
                        ->mapWithKeys(fn($prop, $key) => [
                            $this->overlay->scopeKey($key) => $prop
                        ])
                )
            );

        return $props->all();
    }

    private function clearPartialHeaders(Request $request): void
    {
        $request->headers->remove(InertiaHeader::PARTIAL_COMPONENT);
        $request->headers->remove(InertiaHeader::PARTIAL_ONLY);
    }

    private function setPartialHeaders(Request $request): void
    {
        $pageComponent = $request->header(OverlayHeader::PAGE_COMPONENT);

        if ($this->shouldReloadAllOverlayProps()) {
            $request->headers->remove(InertiaHeader::PARTIAL_ONLY);
        } else {
            $parentPartial = $this->overlay->getReloadedParentKeys();

            if ($parentPartial && $this->parent) {
                if (in_array('*', $parentPartial)) {
                    $parentPartial = collect($this->parent->getProps())->keys()->all();
                }

                $parentPartial = collect($parentPartial)
                    ->map(fn($key) => $this->parent->scopeKey($key))
                    ->all();
            }

            $partial = collect()
                ->merge(explode(',', $request->header(InertiaHeader::PARTIAL_ONLY, '')))
                ->merge($this->overlay->getReloadedOverlayKeys())
                ->merge($this->overlay->getAppendedPropKeys())
                ->filter()
                ->map($this->overlay->scopeKey(...))
                ->merge($parentPartial)
                ->unique()
                ->join(',');

            $request->headers->set(InertiaHeader::PARTIAL_ONLY, $partial);
        }

        $request->headers->set(InertiaHeader::PARTIAL_COMPONENT, $pageComponent);
    }

    private function shouldReloadPageProps(): bool
    {
        return count($this->overlay->getReloadedPageKeys()) > 0;
    }

    private function shouldReloadAllPageProps(): bool
    {
        return in_array('*', $this->overlay->getReloadedPageKeys());
    }

    private function shouldReloadAllOverlayProps(): bool
    {
        return in_array('*', $this->overlay->getReloadedOverlayKeys());
    }

    public function buildOverlayMetaData(Request $request): array
    {
        // TODO: Revisit URL logic
        return [
            'url' => $this->overlay->getUrl(),
            'id' => $this->overlay->getId(),
            'component' => $this->component->name(),
            'config' => $this->component->config($this->overlay),
            'closeRequested' => $this->overlay->isCloseRequested(),
        ];
    }

    public function buildPageData(InitialOverlayResponse|JsonResponse $response, array $metaData): array
    {
        $data = $response instanceof JsonResponse
            ? $response->getData(true)
            : $response->data['page'];

        return [
            ...$data,
            'overlay' => $metaData,
        ];
    }

    private function registerActions(): void
    {
        app(ActionRegistry::class)->register($this->overlay, $this->component);
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