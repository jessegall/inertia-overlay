<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Overlay;
use Symfony\Component\HttpFoundation\Response;

readonly class HandleInertiaOverlayRequests
{

    /** @param \Closure(\Illuminate\Http\Request): (Response) $next */
    public function handle(Request $request, Closure $next)
    {
        if (! $request->isOverlayRequest()) {
            return $next($request);
        }

        if (! $overlay = Overlay::fromRequest($request)) {
            return $next($request);
        }

        if ($request->method() !== Request::METHOD_GET) {
            $overlay->refresh();
        }

        return $next($request);
    }

}