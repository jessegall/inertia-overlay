<?php

namespace Tests\Feature;

use Inertia\Inertia;
use JesseGall\InertiaOverlay\OverlayResponse;
use Orchestra\Testbench\Concerns\WithWorkbench;
use Orchestra\Testbench\TestCase;
use Tests\Mocks\MockOverlay;
use Tests\Mocks\MockOverlayComponent;

class OverlayResponseTest extends TestCase
{
    use WithWorkbench;

    public function test_WhenOpeningOverlay_AllNonLazyPropsAreIncluded()
    {
        $overlay = MockOverlay::make();
        $overlay->setIsInitializing(true);

        $response = new OverlayResponse($overlay, new MockOverlayComponent(
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

        $this->assertEquals('value', data_get($props, $overlay->scopeKey('prop')));
        $this->assertEquals('value', data_get($props, $overlay->scopeKey('closureProp')));
        $this->assertEquals('value', data_get($props, $overlay->scopeKey('alwaysProp')));
        $this->assertEquals('value', data_get($props, $overlay->scopeKey('mergeProp')));

        $keys = collect($props)->dot()->keys();

        $this->assertFalse($keys->contains($overlay->scopeKey('lazyProp')));
        $this->assertFalse($keys->contains($overlay->scopeKey('deferredProp')));
    }

    public function test_WhenPartialReloadingOverlay_OnlyPartialAndAlwaysPropsAreIncluded()
    {
        $overlay = MockOverlay::make();

        $overlay->setPartialProps(
            [
                'closureProp',
                'lazyProp',
            ]
        );

        $response = new OverlayResponse($overlay, new MockOverlayComponent(
            [
                'prop' => 'propValue',
                'closureProp' => fn() => 'closurePropValue',
                'lazyProp' => Inertia::optional(fn() => 'lazyPropValue'),
                'deferredProp' => Inertia::defer(fn() => 'deferredPropValue'),
                'alwaysProp' => Inertia::always(fn() => 'alwaysPropValue'),
                'mergeProp' => Inertia::merge(fn() => 'mergePropValue'),
            ]
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertEquals('closurePropValue', data_get($props, $overlay->scopeKey('closureProp')));
        $this->assertEquals('lazyPropValue', data_get($props, $overlay->scopeKey('lazyProp')));
        $this->assertEquals('alwaysPropValue', $props[$overlay->scopeKey('alwaysProp')]);

        $keys = collect($props)->dot()->keys();

        $this->assertCount(3, $keys);
    }

    public function test_GivenRefreshingProps_WhenPartialReloadingOverlay_OnlyPartialRefreshedAndAlwaysPropsAreIncluded()
    {
        $overlay = MockOverlay::make();

        $overlay->setPartialProps([
            'prop',
        ]);

        $overlay->reloadOverlay(['closureProp', 'lazyProp']);

        $response = new OverlayResponse($overlay, new MockOverlayComponent(
            [
                'prop' => 'propValue',
                'closureProp' => fn() => 'closurePropValue',
                'lazyProp' => Inertia::optional(fn() => 'lazyPropValue'),
                'deferredProp' => Inertia::defer(fn() => 'deferredPropValue'),
                'alwaysProp' => Inertia::always(fn() => 'alwaysPropValue'),
            ]
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertEquals('propValue', data_get($props, $overlay->scopeKey('prop')));
        $this->assertEquals('closurePropValue', data_get($props, $overlay->scopeKey('closureProp')));
        $this->assertEquals('lazyPropValue', data_get($props, $overlay->scopeKey('lazyProp')));
        $this->assertEquals('alwaysPropValue', $props[$overlay->scopeKey('alwaysProp')]);

        $keys = collect($props)->dot()->keys();
        $this->assertCount(4, $keys);
    }

    public function test_GivenPropsAreAppended_WhenReloadingOverlay_AllAppendedPropsAreIncluded()
    {
        $overlay = MockOverlay::make();

        $overlay->setPartialProps([
            'prop',
        ]);

        $overlay->append(
            [
                'appendedProp' => 'appendedValue',
                'closureAppendedProp' => fn() => 'closureAppendedValue',
                'lazyAppendedProp' => Inertia::optional(fn() => 'lazyAppendedValue')
            ]
        );

        $response = new OverlayResponse($overlay, new MockOverlayComponent(
            [
                'prop' => 'propValue',
                'closureProp' => fn() => 'closurePropValue',
                'lazyProp' => Inertia::optional(fn() => 'lazyPropValue'),
                'deferredProp' => Inertia::defer(fn() => 'deferredPropValue'),
                'alwaysProp' => Inertia::always(fn() => 'alwaysPropValue'),
            ],
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertEquals('propValue', data_get($props, $overlay->scopeKey('prop')));
        $this->assertEquals('alwaysPropValue', $props[$overlay->scopeKey('alwaysProp')]);

        $this->assertEquals('appendedValue', data_get($props, $overlay->scopeKey('appendedProp')));
        $this->assertEquals('closureAppendedValue', data_get($props, $overlay->scopeKey('closureAppendedProp')));
        $this->assertEquals('alwaysPropValue', $props[$overlay->scopeKey('alwaysProp')]);


        $keys = collect($props)->dot()->keys();
        $this->assertCount(5, $keys);
    }

    public function test_GivenAllPropsAreReloaded_WhenReloadingOverlay_AllPropsAreIncluded()
    {
        $overlay = MockOverlay::make();

        $overlay->setPartialProps([
            'prop', // Fake partial reload to be overridden
        ]);

        $overlay->reloadOverlay('*');

        $response = new OverlayResponse($overlay, new MockOverlayComponent(
            [
                'prop' => 'propValue',
                'closureProp' => fn() => 'closurePropValue',
                'lazyProp' => Inertia::optional(fn() => 'lazyPropValue'),
                'deferredProp' => Inertia::defer(fn() => 'deferredPropValue'),
                'alwaysProp' => Inertia::always(fn() => 'alwaysPropValue'),
            ]
        ));

        $props = $response->toResponse($overlay->request)->getData(true)['props'];

        $this->assertEquals('propValue', data_get($props, $overlay->scopeKey('prop')));
        $this->assertEquals('closurePropValue', data_get($props, $overlay->scopeKey('closureProp')));
        $this->assertEquals('lazyPropValue', data_get($props, $overlay->scopeKey('lazyProp')));
        $this->assertEquals('deferredPropValue', data_get($props, $overlay->scopeKey('deferredProp')));
        $this->assertEquals('alwaysPropValue', $props[$overlay->scopeKey('alwaysProp')]);

        $keys = collect($props)->dot()->keys();
        $this->assertCount(5, $keys);
    }


}