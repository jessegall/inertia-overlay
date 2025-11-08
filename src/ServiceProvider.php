<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Foundation\Application;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use JesseGall\InertiaOverlay\Http\Controllers\OverlayController;

class ServiceProvider extends \Illuminate\Support\ServiceProvider
{

    public function register(): void
    {
        $config = new Config();

        $this->app->singleton(Config::class, fn() => $config);
        $this->app->singleton(OverlayResponseFactory::class);

        $this->registerRoutes($config);
        $this->registerComponentRegistrar($config);
        $this->registerResponseMacros();
    }

    private function registerRoutes(Config $config): void
    {
        Route::group(
            [
                'as' => 'inertia-overlay.',
                'prefix' => $config->getRoutePrefix(),
                'middleware' => $config->getMiddleware(),
            ],
            function (Router $router) use ($config) {
                $router->any('/action/{action}', [OverlayController::class, 'action'])->name('action');
                $router->get('/render/{type}', [OverlayController::class, 'overlay'])->name('overlay');
            }
        );
    }

    private function registerComponentRegistrar(Config $config): void
    {
        $this->app->singleton(ComponentRegistry::class, function (Application $app) use ($config) {
            $registrar = new ComponentRegistry();

            if ($app->runningInConsole()) {
                return $registrar;
            }

            $components = $config->getComponents();

            foreach ($components as $key => $type) {
                $registrar->register($key, $type);
            }

            return $registrar;
        });
    }

    private function registerResponseMacros(): void
    {
        Inertia::macro('overlay', function ($component = null, $props = []) {
            return InertiaOverlay::render($component, $props);
        });
    }

}
