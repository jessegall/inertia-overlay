<?php

namespace Tests\Mocks;

use Inertia\Support\Header;
use JesseGall\InertiaOverlay\Overlay;

class MockOverlay extends Overlay
{

    public static function make(): static
    {
        $request = request();
        $request->headers->set(Header::INERTIA, 'true');

        return app(static::class, [
            'request' => $request,
            'component' => 'Dashboard',
            'id' => 'mock-overlay-id',
            'url' => url()->current(),
        ]);
    }

    public function getPageComponent(): string
    {
        return 'Dashboard';
    }

    public function setPartialProps(array $keys): void
    {
        $this->request->headers->set(
            Header::PARTIAL_ONLY,
            implode(',', array_map(fn($key) => $this->scopePropKey($key), $keys))
        );
    }

    public function setIsOpening(bool $value): void
    {
        $this->isOpening = $value;
    }

    public function setIsRefocusing(bool $value): void
    {
        $this->isRefocusing = $value;
    }

}

enum MockOverlayLifecycle
{
    case OPENING;
    case REFOCUSING;
    case ACTIVE;
}