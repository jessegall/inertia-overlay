<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
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

        return new OverlayResponse(
            $this->factory->makeFromId($overlayId)
        );
    }

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


}