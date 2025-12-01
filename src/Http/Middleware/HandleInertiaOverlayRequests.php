<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Header;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlaySession;
use Symfony\Component\HttpFoundation\Response;

readonly class HandleInertiaOverlayRequests
{

    /** @param \Closure(\Illuminate\Http\Request): (Response) $next */
    public function handle(Request $request, Closure $next)
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY)) {
            OverlaySession::flush();
            return $next($request);
        }

        if ($request->method() !== Request::METHOD_GET) {
//            Overlay::reloadPage();
        }

        $response = $next($request);
        $referrer = $request->headers->get('referer', '');

        if ($response->isRedirection()) {
            Overlay::reflash();
        }

        if ($response instanceof RedirectResponse && $response->getTargetUrl() == $referrer) {
            $response->setTargetUrl($request->header(Header::OVERLAY_URL));
        }

        return $response;
    }

}