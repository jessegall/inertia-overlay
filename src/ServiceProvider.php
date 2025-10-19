<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Foundation\Application;

class ServiceProvider extends \Illuminate\Support\ServiceProvider
{

    public function register(): void
    {
        $this->registerRegistrar();
        $this->registerFactory();
    }

    function registerRegistrar(): void
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

    public function registerFactory(): void
    {
        $this->app->singleton(OverlayFactory::class);
    }

}
