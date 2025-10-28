<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use ReflectionClass;
use ReflectionMethod;
use RuntimeException;

readonly class OverlayActionRunner
{

    public function run(Overlay $overlay, OverlayComponent $component, string $action)
    {
        $actions = $this->resolveActions($component);

        if (! $callback = $actions[$action] ?? null) {
            throw new RuntimeException("Action [{$action}] not found on overlay");
        }

        return app()->call($callback, [
            'overlay' => $overlay,
        ]);
    }

    /**
     * @param OverlayComponent $component
     * @return array<string, callable>
     */
    private function resolveActions(OverlayComponent $component): array
    {
        $reflector = new ReflectionClass($component);

        return collect($reflector->getMethods())
            ->filter(fn(ReflectionMethod $method) => $method->getAttributes(OverlayAction::class))
            ->mapWithKeys(function (ReflectionMethod $method) use ($component) {
                [$attribute] = $method->getAttributes(OverlayAction::class);
                $instance = $attribute->newInstance();
                return [$instance->name => $method->getClosure($component)];
            })
            ->all();
    }

}