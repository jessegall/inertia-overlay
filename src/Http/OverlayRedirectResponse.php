<?php

namespace JesseGall\InertiaOverlay\Http;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\OverlayFactory;
use JesseGall\InertiaOverlay\OverlayHeader;
use JesseGall\InertiaOverlay\OverlayRegistrar;

class OverlayRedirectResponse extends RedirectResponse
{

    public function __construct(string $overlayId)
    {
        $url = "{$this->resolveRedirectUrl()}?overlay={$overlayId}";

        if (request()->inertiaOverlay()) {
            session()->flash(OverlayHeader::OVERLAY_PREVIOUS_ID, request()->header(OverlayHeader::OVERLAY_ID));
            session()->flash(OverlayHeader::OVERLAY_ID, $overlayId);
            session()->flash(OverlayHeader::OVERLAY_OPENING, true);
            session()->flash(OverlayHeader::OVERLAY_CLOSING, false);
            session()->flash(OverlayHeader::OVERLAY_INDEX, request()->header(OverlayHeader::OVERLAY_INDEX, 0) + 1);
        }

        parent::__construct(
            url: $url,
        );
    }

    public static function fromClass(string $class, array $args = []): self
    {
        $registrar = app()->make(OverlayRegistrar::class);
        $factory = app()->make(OverlayFactory::class);

        return new self(
            $factory->generateOverlayId($registrar->resolveTypename($class), $args)
        );
    }

    public static function fromTypename(string $typename, array $args = []): self
    {
        $factory = app()->make(OverlayFactory::class);

        return new self(
            $factory->generateOverlayId($typename, $args)
        );
    }

    private function resolveRedirectUrl(): string
    {
        $request = app()->make(Request::class);

        if ($request->inertiaOverlay()) {
            $url = $request->header(OverlayHeader::OVERLAY_ROOT_URL);
        } else {
            $url = $request->headers->get('referer') ?? $request->url();
        }

        return explode('?', $url)[0];
    }


}