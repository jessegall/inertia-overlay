<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Header;
use JesseGall\InertiaOverlay\OverlayRedirectResponse;
use Symfony\Component\HttpFoundation\Response;

readonly class HandleInertiaOverlayRequests
{

    /** @param \Closure(\Illuminate\Http\Request): (Response) $next */
    public function handle(Request $request, Closure $next)
    {
        if ($request->hasHeader(Header::INERTIA_OVERLAY)) {
            $response = $next($request);

            if ($response instanceof RedirectResponse && ! $response instanceof OverlayRedirectResponse) {
                $response->setTargetUrl($request->header(Header::OVERLAY_URL));
            }

            return $response;
        }

        return $next($request);
    }

}