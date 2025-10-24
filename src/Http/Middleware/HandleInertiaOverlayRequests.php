<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Overlay;

readonly class HandleInertiaOverlayRequests
{

    /** @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next */
    public function handle(Request $request, Closure $next)
    {
        if (! $request->inertiaOverlay()) {
            return $next($request);
        }

        $overlay = app(Overlay::class);

        if ($request->method() !== Request::METHOD_GET) {
            $overlay->refresh();
            return $next($request);
        }

        if ($overlay->closeRequested()) {
            return back();
        }

        return $overlay->render();
    }

}