<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

class ServiceProvider extends \Illuminate\Support\ServiceProvider
{

    public function register(): void
    {
        $this->app->singleton(Overlay::class);
        $this->registerRegistrar();

        Route::post('_inertia/overlay', fn() => back());
    }

    public function boot(): void
    {
        $this->bootMacros();
    }

    # ----------[ Internal ]----------

    private function registerRegistrar(): void
    {
        $this->app->singleton(OverlayRegistrar::class, function (Application $app) {
            $registrar = new OverlayRegistrar();

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
                && $this->header(InertiaOverlay::OVERLAY);
        });
    }

}
