<?php

namespace JesseGall\InertiaOverlay\Http;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use JesseGall\InertiaOverlay\ContextAwareOverlay;

readonly class OverlayResponse implements Responsable
{

    public function __construct(
        private ContextAwareOverlay $overlay,
        private JsonResponse $response
    ) {}

    public function toResponse($request): JsonResponse
    {
        $data = $this->response->getData(true);

        $data['overlay'] = [
            'id' => $this->overlay->context->overlayId,
            'type' => $this->overlay->context->typename,
            'variant' => $this->overlay->variant(),
            'size' => $this->overlay->size(),
            'props' => $this->overlay->keys(),
        ];

        return new JsonResponse($data, $this->response->getStatusCode(), $this->response->headers->all());
    }

}