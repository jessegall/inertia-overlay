<?php

namespace JesseGall\InertiaOverlay;

class ServiceProvider extends \Illuminate\Support\ServiceProvider
{

    public function register(): void
    {
        $this->registerRegistrar();
        $this->registerFactory();
    }

    function registerRegistrar(): void
    {
        $this->app->singleton(OverlayRegistrar::class, function () {
            $registrar = new OverlayRegistrar();

            foreach (config('overlays') as $key => $type) {
                $registrar->register($key, $type);
            }

            return $registrar;
        });
    }

    public function registerFactory(): void
    {
        $this->app->singleton(OverlayFactory::class);
    }

}
