<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Header;
use JesseGall\InertiaOverlay\Overlay;
use Symfony\Component\HttpFoundation\Response;

readonly class HandleInertiaOverlayRequests
{

    /** @param \Closure(\Illuminate\Http\Request): (Response) $next */
    public function handle(Request $request, Closure $next)
    {
        if ($request->hasHeader(Header::INERTIA_OVERLAY)) {
            $overlay = Overlay::fromRequest($request);

            $response = $next($request);

            if ($response instanceof RedirectResponse) {
                $redirectUrl = strtok($response->getTargetUrl(), '?');
                $requestUrl = strtok($request->url(), '?');

                if ($redirectUrl === $requestUrl) {
                    $response->setTargetUrl($overlay->getUrl());
                }
            }

            return $response;
        }

        return $next($request);
    }

}