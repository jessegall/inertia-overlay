<?php

namespace JesseGall\InertiaOverlay\Http;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Support\Header;
use JesseGall\InertiaOverlay\ContextAwareOverlay;

readonly class OverlayResponse implements Responsable
{

    public function __construct(
        private ContextAwareOverlay $overlay,
    ) {}

    public function toResponse($request): JsonResponse
    {
        if ($this->overlay->context->isOpening()) {
            $this->addOverlayPropsToPartialOnlyHeader($request);
        }

        return $this->injectOverlayDataInResponse(
            $this->createInertiaResponse($request)
        );
    }

    # ----------[ Internal ]----------

    private function addOverlayPropsToPartialOnlyHeader(Request $request): void
    {
        $only = str($request->header(Header::PARTIAL_ONLY, ''))
            ->explode(',')
            ->merge($this->overlay->keys())
            ->unique()
            ->join(',');

        $request->headers->set(Header::PARTIAL_ONLY, $only);
    }

    private function createInertiaResponse(Request $request): JsonResponse
    {
        return Inertia::render($this->overlay->context->getPageComponent(), $this->overlay->props())
            ->toResponse($request);
    }

    private function injectOverlayDataInResponse(JsonResponse $response): JsonResponse
    {
        return $response->setData(
            [
                ...$response->getData(true),
                'overlay' => $this->generateOverlayData()
            ]
        );
    }

    private function generateOverlayData(): array
    {
        return [
            'id' => $this->overlay->context->overlayId,
            'typename' => $this->overlay->context->typename,
            'variant' => $this->overlay->variant(),
            'size' => $this->overlay->size(),
            'props' => $this->overlay->keys(),
        ];
    }

}