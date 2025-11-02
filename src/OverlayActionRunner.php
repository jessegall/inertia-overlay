<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use Laravel\SerializableClosure\SerializableClosure;
use ReflectionClass;
use ReflectionMethod;

readonly class OverlayActionRunner
{

    public function run(Overlay $overlay, OverlayComponent $component, string $action)
    {
        /** @var \Closure $callback */
        $callback = $overlay->get("actions.{$action}")->getClosure();

        $callback = $callback->bindTo($component, $component);

        return app()->call($callback,
            [
                'overlay' => $overlay,
                'payload' => request()->all(),
            ]
        );
    }

    public function flash(Overlay $overlay, OverlayComponent $component): void
    {
        $actions = $this->resolveActions($component);

        foreach ($actions as $name => $action) {
            $overlay->flash("actions.{$name}", new SerializableClosure($action));
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