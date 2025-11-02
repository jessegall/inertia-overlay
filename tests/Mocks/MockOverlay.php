<?php

namespace Tests\Mocks;

use Inertia\Support\Header as InertiaHeader;
use JesseGall\InertiaOverlay\Header as OverlayHeader;
use JesseGall\InertiaOverlay\Overlay;

class MockOverlay extends Overlay
{

    public static function make(): static
    {
        $request = request();
        $request->headers->set(InertiaHeader::INERTIA, 'true');
        $request->headers->set(OverlayHeader::PAGE_COMPONENT, 'Dashboard');

        return app(static::class, [
            'request' => $request,
            'component' => 'Dashboard',
            'id' => 'mock-overlay-id',
            'url' => url()->current(),
            'initializing' => false,
            'baseUrl' => url()->current(),
        ]);
    }

    public function getPageComponent(): string
    {
        return 'Dashboard';
    }

    public function setPartialProps(array $keys): void
    {
        $this->request->headers->set(InertiaHeader::PARTIAL_ONLY, implode(',', $keys));
        $this->request->headers->set(InertiaHeader::PARTIAL_COMPONENT, 'Dashboard');
    }

    public function setIsInitializing(bool $value): void
    {
        $this->initializing = $value;
    }

}

enum MockOverlayLifecycle
{
    case OPENING;
    case REFOCUSING;
    case ACTIVE;
}