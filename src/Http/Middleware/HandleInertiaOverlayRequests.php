<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Http\OverlayResponse;
use JesseGall\InertiaOverlay\OverlayFactory;

readonly class HandleInertiaOverlayRequests
{

    public function __construct(
        private OverlayFactory $factory,
    ) {}

    public function handle(Request $request, Closure $next)
    {
        if (! $request->inertiaOverlay() || ! $overlayId = $this->resolveOverlayId($request)) {
            return $next($request);
        }

        return new OverlayResponse(
            $this->factory->makeFromId($overlayId)
        );
    }

    private function resolveOverlayId(Request $request): string|null
    {
        return $request->query('overlay');
    }


}