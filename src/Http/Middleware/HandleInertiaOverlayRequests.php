<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\ContextAwareOverlay;
use JesseGall\InertiaOverlay\Http\OverlayResponse;
use JesseGall\InertiaOverlay\OverlayFactory;
use JesseGall\InertiaOverlay\OverlayHeader;

readonly class HandleInertiaOverlayRequests
{

    public function __construct(
        private OverlayFactory $factory,
    ) {}

    /** @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next */
    public function handle(Request $request, Closure $next)
    {
        if (! $request->inertiaOverlay()) {
            return $next($request);
        }

        if (! $overlayId = $this->resolveOverlayId($request)) {
            return $next($request);
        }

        if ($request->getMethod() !== 'GET') {
            $this->flagOverlayAsRedirected($overlayId);
            return $next($request);
        }

        $overlay = $this->factory->makeFromId($overlayId);

        // Redirect to a URL that only contains the overlay query parameter to make sure no state is transferred.
        if ($overlay->context->isOpening() && count($request->query()) > 1) {
            return redirect()->to($request->url() . '?overlay=' . $overlay->context->overlayId);
        }

        if ($overlay->context->isClosing()) {
            return redirect()->to($this->resolveCloseUrl($overlay));
        }

        return new OverlayResponse($overlay);
    }

    # ----------[ Internal ]----------

    private function resolveOverlayId(Request $request): string|null
    {
        if ($request->method() === 'GET') {
            return $request->query('overlay');
        }

        return $request->header(OverlayHeader::OVERLAY_ID);
    }

    private function flagOverlayAsRedirected(string $overlayId): void
    {
        session()->flash(OverlayHeader::OVERLAY_REDIRECTED_ID, $overlayId);
    }

    private function resolveCloseUrl(ContextAwareOverlay $overlay): string
    {
        if ($overlay->context->getIndex() === 0) {
            return $this->unsetOverlayQueryParam($overlay->context->getRootUrl());
        }

        [$url] = explode('?', $overlay->context->getRootUrl());
        $previousId = $overlay->context->getPreviousId();

        return "{$url}?overlay={$previousId}";
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