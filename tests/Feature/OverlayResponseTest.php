<?php

namespace Tests\Feature;

use Inertia\Inertia;
use JesseGall\InertiaOverlay\Contracts\SkipReloadOnRefocus;
use Orchestra\Testbench\Concerns\WithWorkbench;
use Orchestra\Testbench\TestCase;
use Tests\Mocks\MockOverlay;
use Tests\Mocks\MockOverlayComponent;
use Tests\Mocks\MockOverlayLifecycle;

class OverlayResponseTest extends TestCase
{
    use WithWorkbench;

    public function test_WhenOpeningOverlay_AllNonLazyPropsAreIncluded()
    {
        $overlay = new MockOverlay(MockOverlayLifecycle::OPENING);

        $response = $overlay->render(new MockOverlayComponent(
            [
                'prop' => 'value',
                'closureProp' => fn() => 'value',
                'lazyProp' => Inertia::optional(fn() => 'value'),
                'deferredProp' => Inertia::defer(fn() => 'value'),
                'alwaysProp' => Inertia::always(fn() => 'value'),
                'mergeProp' => Inertia::merge(fn() => 'value'),
            ]
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertArrayHasKey($overlay->scopePropKey('prop'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('closureProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('alwaysProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('mergeProp'), $props);

        $this->assertArrayNotHasKey($overlay->scopePropKey('lazyProp'), $props);
        $this->assertArrayNotHasKey($overlay->scopePropKey('deferredProp'), $props);
    }

    public function test_WhenRefocusingOverlay_AllNonLazyPropsAreIncluded()
    {
        $overlay = new MockOverlay(MockOverlayLifecycle::OPENING);

        $response = $overlay->render(new MockOverlayComponent(
            [
                'prop' => 'value',
                'closureProp' => fn() => 'value',
                'lazyProp' => Inertia::optional(fn() => 'value'),
                'deferredProp' => Inertia::defer(fn() => 'value'),
                'alwaysProp' => Inertia::always(fn() => 'value'),
                'mergeProp' => Inertia::merge(fn() => 'value'),
            ]
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertArrayHasKey($overlay->scopePropKey('prop'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('closureProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('alwaysProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('mergeProp'), $props);

        $this->assertArrayNotHasKey($overlay->scopePropKey('lazyProp'), $props);
        $this->assertArrayNotHasKey($overlay->scopePropKey('deferredProp'), $props);
    }

    public function test_GivenComponentImplementsSkipReloadOnRefocus_WhenRefocusingOverlay_OnlyAlwaysPropsAreIncluded()
    {
        $overlay = new MockOverlay(MockOverlayLifecycle::REFOCUSING);

        $component = new class(
            [
                'prop' => 'value',
                'closureProp' => fn() => 'value',
                'lazyProp' => Inertia::optional(fn() => 'value'),
                'deferredProp' => Inertia::defer(fn() => 'value'),
                'alwaysProp' => Inertia::always(fn() => 'value'),
                'mergeProp' => Inertia::merge(fn() => 'value'),
            ]
        ) extends MockOverlayComponent implements SkipReloadOnRefocus {

        };

        $response = $overlay->render($component);

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertCount(1, $props);
        $this->assertArrayHasKey($overlay->scopePropKey('alwaysProp'), $props);
    }

    public function test_WhenPartialReloadingOverlay_OnlyPartialAndAlwaysPropsAreIncluded()
    {
        $overlay = new MockOverlay(MockOverlayLifecycle::ACTIVE);

        $overlay->setPartialProps(
            [
                'closureProp',
                'lazyProp',
            ]
        );

        $response = $overlay->render(new MockOverlayComponent(
            [
                'prop' => 'value',
                'closureProp' => fn() => 'value',
                'lazyProp' => Inertia::optional(fn() => 'value'),
                'deferredProp' => Inertia::defer(fn() => 'value'),
                'alwaysProp' => Inertia::always(fn() => 'value'),
                'mergeProp' => Inertia::merge(fn() => 'value'),
            ]
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertCount(3, $props);
        $this->assertArrayHasKey($overlay->scopePropKey('closureProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('lazyProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('alwaysProp'), $props);
    }

    public function test_GivenRefreshingProps_WhenPartialReloadingOverlay_OnlyPartialRefreshedAndAlwaysPropsAreIncluded()
    {
        $overlay = new MockOverlay(MockOverlayLifecycle::ACTIVE);

        $overlay->setPartialProps(
            [
                'prop',
            ]
        );

        $overlay->refreshProps(['closureProp', 'lazyProp']);

        $response = $overlay->render(new MockOverlayComponent(
            [
                'prop' => 'value',
                'closureProp' => fn() => 'value',
                'lazyProp' => Inertia::optional(fn() => 'value'),
                'deferredProp' => Inertia::defer(fn() => 'value'),
                'alwaysProp' => Inertia::always(fn() => 'value'),
            ]
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertCount(4, $props);
        $this->assertArrayHasKey($overlay->scopePropKey('prop'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('closureProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('lazyProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('alwaysProp'), $props);
    }

    public function test_GivenPropsAreAppended_WhenReloadingOverlay_AllAppendedPropsAreIncluded()
    {
        $overlay = new MockOverlay(MockOverlayLifecycle::ACTIVE);

        $overlay->setPartialProps(
            [
                'prop',
            ]
        );

        $overlay->appendProps(
            [
                'appendedProp' => 'value',
                'closureAppendedProp' => fn() => 'value',
                'lazyAppendedProp' => Inertia::optional(fn() => 'value'),
            ]
        );

        $response = $overlay->render(new MockOverlayComponent(
            [
                'prop' => 'value',
                'closureProp' => fn() => 'value',
                'lazyProp' => Inertia::optional(fn() => 'value'),
                'deferredProp' => Inertia::defer(fn() => 'value'),
                'alwaysProp' => Inertia::always(fn() => 'value'),
            ]
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertCount(5, $props);

        $this->assertArrayHasKey($overlay->scopePropKey('prop'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('alwaysProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('appendedProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('closureAppendedProp'), $props);
        $this->assertArrayHasKey($overlay->scopePropKey('lazyAppendedProp'), $props);

        $this->assertEquals('value', $props[$overlay->scopePropKey('appendedProp')]);
        $this->assertEquals('value', $props[$overlay->scopePropKey('closureAppendedProp')]);
        $this->assertEquals('value', $props[$overlay->scopePropKey('lazyAppendedProp')]);
    }


}