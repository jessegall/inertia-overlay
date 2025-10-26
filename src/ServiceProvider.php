<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use JesseGall\InertiaOverlay\Http\Controllers\OverlayController;

class ServiceProvider extends \Illuminate\Support\ServiceProvider
{

    public function register(): void
    {
        $this->registerOverlayRegistrar();
        $this->registerOverlayRoutes();
        $this->registerResponseMacros();
    }

    private function registerOverlayRoutes(): void
    {
        Route::middleware('web')->get('/overlay/{type}', OverlayController::class);
    }

    private function registerOverlayRegistrar(): void
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

    private function registerResponseMacros(): void
    {
        Request::macro('isOverlayRequest', function (): bool {
            return $this->inertia() && $this->header(Header::OVERLAY_ID);
        });

        Inertia::macro('overlay', function ($component, $props = []) {
            return InertiaOverlay::render($component, $props);
        });
    }

}
