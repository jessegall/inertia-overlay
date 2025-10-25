<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use JesseGall\InertiaOverlay\Http\Controllers\OverlayController;
use JesseGall\InertiaOverlay\Http\OverlayResponse;

class ServiceProvider extends \Illuminate\Support\ServiceProvider
{

    public function register(): void
    {
        $this->registerRegistrar();

        Route::middleware('web')
            ->get('/overlay/{type}', OverlayController::class);
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
            macro: function (string $component, array $props = [], OverlayConfig $config = new OverlayConfig()): OverlayResponse {
                $request = app(Request::class);

                if ($request->inertiaOverlay() && $request->header(Header::OVERLAY_URL) === $request->url()) {
                    $overlay = Overlay::fromRequest($request);
                } else {
                    $overlay = Overlay::new();
                }

                return $overlay->render(
                    new RouteOverlayComponent(
                        $component,
                        $props,
                        $config
                    )
                );
            }
        );
    }

}
