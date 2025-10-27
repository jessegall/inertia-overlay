<?php

namespace Tests\Mocks;

use Inertia\Support\Header;
use JesseGall\InertiaOverlay\Overlay;

class MockOverlay extends Overlay
{

    public function __construct(
        public MockOverlayLifecycle $state,
    )
    {
        $request = request();
        $request->headers->set(Header::INERTIA, 'true');

        parent::__construct(
            request: $request,
            id: 'mock-overlay',
        );
    }

    public function isOpening(): bool
    {
        return $this->state === MockOverlayLifecycle::OPENING;
    }

    public function isDeferredLoading(): bool
    {
        return $this->state === MockOverlayLifecycle::DEFERRED_LOADING;
    }

    public function isRefocusing(): bool
    {
        return $this->state === MockOverlayLifecycle::REFOCUSING;
    }

    public function getPageComponent(): string
    {
        return 'Dashboard';
    }

}

enum MockOverlayLifecycle
{
    case OPENING;
    case REFOCUSING;
    case DEFERRED_LOADING;
    case ACTIVE;
}