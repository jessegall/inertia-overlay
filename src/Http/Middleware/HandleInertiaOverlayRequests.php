<?php

namespace JesseGall\InertiaOverlay\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Header;
use JesseGall\InertiaOverlay\Overlay;
use JesseGall\InertiaOverlay\OverlayComponentDecorator;
use JesseGall\InertiaOverlay\OverlayComponentFactory;
use JesseGall\InertiaOverlay\RouteOverlayComponent;
use Symfony\Component\HttpFoundation\Response;

readonly class HandleInertiaOverlayRequests
{

    public function __construct(
        private OverlayComponentFactory $overlayComponentFactory,
    ) {}

    /** @param \Closure(\Illuminate\Http\Request): (Response) $next */
    public function handle(Request $request, Closure $next)
    {
        if (! $request->inertiaOverlay()) {
            return $next($request);
        }

        $overlay = Overlay::fromRequest($request);

        if ($request->method() !== Request::METHOD_GET) {
            $overlay->refresh();
            return $next($request);
        }

        if ($overlay->shouldForwardedToRoute()) {
            return $next($request);
        }

        if ($overlay->type === RouteOverlayComponent::class) {
            return $this->handleRouteOverlay($overlay, $request);
        }

        $component = $this->overlayComponentFactory->make($overlay->type, $overlay->input->get());
        $component = new OverlayComponentDecorator($component);

        if ($action = $overlay->getAction()) {
            $component->run($overlay, $action);
        }

        return $overlay->render($component);
    }

    private function handleRouteOverlay(Overlay $overlay, Request $request): Response
    {
        $internalRequest = Request::create($overlay->input->get('url'));
        $internalRequest->headers->replace($request->headers->all());
        $internalRequest->headers->set(Header::INTERNAL_REQUEST, 'true');

        return app()->handle($internalRequest);
    }


}