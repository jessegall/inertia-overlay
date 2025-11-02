<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use InvalidArgumentException;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use Laravel\SerializableClosure\SerializableClosure;
use ReflectionClass;
use ReflectionMethod;

readonly class OverlayActionRunner
{

    public function run(Overlay $overlay, OverlayComponent $component, string $action)
    {
        $callback = $overlay->session()->get("actions.{$action}")->getClosure();

        return app()->call($callback,
            [
                'overlay' => $overlay,
                'component' => $component,
                'payload' => request()->all(),
            ]
        );
    }

    public function register(Overlay $overlay, OverlayComponent $component): void
    {
        $actions = $this->resolveActions($component);

        foreach ($actions as $name => $action) {
            $action = match (true) {
                $action instanceof Closure => new SerializableClosure($action),
                is_callable($action) => new SerializableClosure(fn(...$args) => $action(...$args)),
                default => throw new InvalidArgumentException("Overlay action '{$name}' is not callable."),
            };

            $overlay->session()->put("actions.{$name}", $action);
        }
    }

    /**
     * @param OverlayComponent $component
     * @return array<string, callable>
     */
    public function resolveActions(OverlayComponent $component): array
    {
        $reflector = new ReflectionClass($component);

        if (method_exists($component, 'getOverlayActions')) {
            $actions = $component->getOverlayActions();
        } else {
            $actions = [];
        }

        return collect($reflector->getMethods())
            ->filter(fn(ReflectionMethod $method) => $method->getAttributes(OverlayAction::class))
            ->mapWithKeys(function (ReflectionMethod $method) use ($component) {
                [$attribute] = $method->getAttributes(OverlayAction::class);
                $instance = $attribute->newInstance();
                return [$instance->name ?? $method->name => $method->getClosure($component)];
            })
            ->merge($actions)
            ->all();
    }

}