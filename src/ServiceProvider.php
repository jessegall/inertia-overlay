<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Inertia\Inertia;
use JesseGall\InertiaOverlay\Enums\OverlayVariant;

class ServiceProvider extends \Illuminate\Support\ServiceProvider
{

    public function register(): void
    {
        $this->registerRegistrar();
    }

    public function boot(): void
    {
        $this->bootMacros();
    }

    # ----------[ Internal ]----------

    private function registerRegistrar(): void
    {
        $this->app->singleton(OverlayComponentRegistrar::class, function (Application $app) {
            $registrar = new OverlayComponentRegistrar();

            if (! $app->runningInConsole()) {
                foreach (config('overlays.overlay_class_map', []) as $key => $type) {
                    $registrar->register($key, $type);
                }
            }

            return $registrar;
        });
    }

    private function bootMacros(): void
    {
        Request::macro('inertiaOverlay', function (): bool {
            /** @var Request $this */
            return $this->inertia()
                && $this->header(Header::OVERLAY);
        });

        Inertia::macro('overlay',
            macro: function (string $component, array $props = []) {
                $request = app(Request::class);

                if ($request->hasHeader(Header::INTERNAL_REQUEST)) {
                    $overlay = Overlay::fromRequest($request);
                } else {
                    $overlay = Overlay::new(RouteOverlayComponent::class, [
                        'url' => $request->fullUrl(),
                    ]);
                }

                return $overlay->render(
                    new RouteOverlayComponent(
                        $component,
                        $request->fullUrl(),
                        $props,
                        new OverlayConfig(
                            variant: OverlayVariant::DRAWER
                        )
                    )
                );
            }
        );
    }

}
