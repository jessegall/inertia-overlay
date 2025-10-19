<?php

namespace JesseGall\InertiaOverlay\Http;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Support\Header;
use JesseGall\InertiaOverlay\ContextAwareOverlay;

readonly class OverlayResponse implements Responsable
{

    public function __construct(
        private ContextAwareOverlay $overlay,
    ) {}

    public function toResponse($request)
    {
        // Redirect to a URL that only contains the overlay query parameter to make sure no state is transferred.
        if ($this->overlay->context->isOpening() && count($request->query()) > 1) {
            return redirect()->to($request->url() . '?overlay=' . $this->overlay->context->overlayId);
        }

        // Handle closing overlays by redirecting to the previous URL.
        if ($this->overlay->context->isClosing()) {
            return redirect()->to($this->resolveCloseUrl());
        }

        // If the overlay is not yet active, we need to add its props to the partial data header so they are included in the response.
        if (! $this->overlay->context->isMounted()) {
            $this->addOverlayPropsToPartialOnlyHeader($request);
        }

        $response = Inertia::render($this->overlay->context->getPageComponent(), $this->overlay->props())
            ->toResponse($request);

        $response->setData(
            [
                ...json_decode($response->getContent(), true),
                'overlay' => $this->getOverlayData()
            ]
        );

        return $response;
    }

    public function getOverlayData(): array
    {
        return [
            'id' => $this->overlay->context->overlayId,
            'type' => $this->overlay->context->typename,
            'variant' => $this->overlay->variant(),
            'size' => $this->overlay->size(),
            'props' => $this->overlay->keys(),
        ];
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

    private function resolveCloseUrl(): string
    {
        if ($this->overlay->context->getIndex() === 0) {
            return $this->unsetOverlayQueryParam($this->overlay->context->getRootUrl());
        }

        [$url] = explode('?', $this->overlay->context->getRootUrl());
        $previousId = $this->overlay->context->getPreviousId();

        return "{$url}?overlay={$previousId}";
    }

    private function unsetOverlayQueryParam(string $url): string
    {
        $query = parse_url($url, PHP_URL_QUERY);

        if ($query) {
            parse_str($query, $queryParams);
            unset($queryParams['overlay']);
            $url = strtok($url, '?');

            if (count($queryParams) > 0) {
                $url .= '?' . http_build_query($queryParams);
            }
        }

        return $url;
    }

}