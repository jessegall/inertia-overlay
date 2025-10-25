<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Pipeline\Pipeline;
use JesseGall\InertiaOverlay\Contracts\AppliesMiddleware;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class OverlayComponentFactory
{

    public function __construct(
        private OverlayComponentRegistrar $registrar,
    ) {}

    public function make(string $component, array $argument = []): OverlayComponent
    {
        if (class_exists($component)) {
            $class = $component;
        } else {
            $class = $this->registrar->resolveComponentClass($component);
        }

        $middleware = $this->resolveComponentMiddleware($class);

        return app(Pipeline::class)
            ->send(new OverlayInput($argument))
            ->through($middleware)
            ->then(fn(OverlayInput $arguments) => $this->newComponent($class, $arguments));
    }

    /**
     * @param class-string<OverlayConfig> $class
     */
    private function resolveComponentMiddleware(string $class): array
    {
        if (is_subclass_of($class, AppliesMiddleware::class)) {
            return $class::middleware();
        }

        return [];
    }

    /**
     * @param class-string<OverlayComponent> $class
     * @param OverlayInput $arguments
     * @return OverlayComponent
     */
    private function newComponent(string $class, OverlayInput $arguments): OverlayComponent
    {
        $arguments = $arguments->toArray();

        if (is_subclass_of($class, 'Spatie\\LaravelData\\Data')) {
            return $class::from($arguments);
        }

        return app($class, $arguments);
    }

}