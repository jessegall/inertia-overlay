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
            $this->printDebugInformation($request);

            $response = $next($request);
            
            if ($response instanceof RedirectResponse) {
                $redirectUrl = strtok($response->getTargetUrl(), '?');
                $requestUrl = strtok($request->url(), '?');

                if ($redirectUrl === $requestUrl) {
                    $originalQuery = parse_url($response->getTargetUrl(), PHP_URL_QUERY);
                    $newUrl = $overlay->getUrl();

                    if ($originalQuery) {
                        $newUrl .= (parse_url($newUrl, PHP_URL_QUERY) ? '&' : '?') . $originalQuery;
                    }

                    $response->setTargetUrl($newUrl);
                }
            }

            return $response;
        }

        return $next($request);
    }

    private function printDebugInformation(Request $request): void
    {
        $debug = [
            Header::INERTIA_OVERLAY,
            Header::OVERLAY_ID,
            Header::OVERLAY_ACTION,
            Header::OVERLAY_REFOCUS,
            Header::OVERLAY_DEFERRED,
        ];

        ray(
            collect($debug)
                ->mapWithKeys(fn($header) => [$header => request()->headers->get($header)])
                ->all()
        );

//        if ($overlay = Overlay::fromRequest($request)) {
//            $data = [
//                'overlayId' => $overlay->id,
//                'overlayUrl' => $overlay->url,
//                'action' => $overlay->getAction(),
//                'isOpening' => $overlay->isOpening(),
//                'isRefocusing' => $overlay->isRefocusing(),
//                'isDeferred' => $overlay->isLoadingDeferred(),
//            ];
//
//            ray($data);
//        }
    }

}