<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Support\Header;
use JesseGall\InertiaOverlay\ContextAwareOverlay;
use JesseGall\InertiaOverlay\Http\OverlayResponse;
use JesseGall\InertiaOverlay\OverlayFactory;

readonly class HandleInertiaOverlayRequests
{

    public function __construct(
        private OverlayFactory $factory,
    ) {}

    public function handle(Request $request, Closure $next)
    {
        if (! $this->isOverlayRequest($request) || ! $overlayId = $this->resolveOverlayId($request)) {
            return $next($request);
        }

        $overlay = $this->factory->make($overlayId);

        // Redirect to a URL that only contains the overlay query parameter to make sure no state is transferred.
        if ($overlay->context->isOpening() && count($request->query()) > 1) {
            return redirect()->to($request->url() . '?overlay=' . $overlayId);
        }

        // Handle closing overlays by redirecting to the previous URL.
        if ($overlay->context->isClosing()) {
            return redirect()->to($this->resolveCloseUrl($overlay));
        }

        // If the overlay is not yet active, we need to add its props to the partial data header so they are included in the response.
        if (! $overlay->context->isActive()) {
            $this->addOverlayPropsToPartialOnlyHeader($request, $overlay);
        }

        // Share the overlay props with Inertia.
        Inertia::share($overlay->props());

        return $this->buildResponse($request, $overlay);
    }

    # ----------[ Internal ]----------

    private function isOverlayRequest(Request $request): bool
    {
        return $request->inertia() && $request->header('X-Inertia-Overlay');
    }

    private function resolveOverlayId(Request $request): string|null
    {
        return $request->query('overlay');
    }

    private function addOverlayPropsToPartialOnlyHeader(Request $request, ContextAwareOverlay $overlay): void
    {
        $only = str($request->header(Header::PARTIAL_ONLY, ''))
            ->explode(',')
            ->merge($overlay->keys())
            ->unique()
            ->toArray();

        $request->headers->set(Header::PARTIAL_ONLY, implode(',', $only));
    }

    private function resolveCloseUrl(ContextAwareOverlay $overlay): string
    {
        if ($overlay->context->index() === 0) {
            return $this->unsetOverlayQueryParam($overlay->context->rootUrl());
        }

        return $overlay->context->previousUrl();
    }

    private function buildResponse(Request $request, ContextAwareOverlay $overlay): OverlayResponse
    {
        $response = Inertia::render($overlay->context->pageComponent())->toResponse($request);

        return new OverlayResponse($overlay, $response);
    }

    private function unsetOverlayQueryParam(string $url): string
    {
        $query = parse_url($url, PHP_URL_QUERY);

        if ($query) {
            parse_str($query, $queryParams);
            unset($queryParams['overlay']);
            $url = strtok($url, '?');

            if (count($queryParams) > 0) {
                $url .= '?' . http_build_query($queryParams);
            }
        }

        return $url;
    }


}