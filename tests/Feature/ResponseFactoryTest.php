<?php

namespace Tests\Feature;

use JesseGall\InertiaOverlay\InertiaOverlay;
use JesseGall\InertiaOverlay\OverlaySession;
use Orchestra\Testbench\Concerns\WithWorkbench;
use Orchestra\Testbench\TestCase;
use Tests\Feature\Concerns\GeneratesFakePageData;

class ResponseFactoryTest extends TestCase
{
    use WithWorkbench;
    use GeneratesFakePageData;

    public function test_GivenNoOverlaySessionExists_WhenBuild_ThenNewOverlayIsCreated()
    {
        $response = InertiaOverlay::build()->renderer('TestComponent');

        $this->assertTrue($response->overlay->isInitializing());
    }

    public function test_GivenOverlaySessionExists_WhenBuild_ThenExistingOverlayIsUsed()
    {
        $session = OverlaySession::fetch('test-session');
        $session->setPage($this->generateFakePageData(overlayId: 'test-session'));

        $response = InertiaOverlay::build()->renderer('TestComponent');

        $this->assertFalse($response->overlay->isInitializing());
    }

}