<?php

namespace JesseGall\InertiaOverlay;

use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use ReflectionClass;
use ReflectionMethod;
use RuntimeException;

class OverlayComponentDecorator implements OverlayComponent
{

    /**
     * The props of the component
     *
     * @var array
     */
    private array $props;

    /**
     * The available actions on the component
     *
     * @var array<string, callable>
     */
    private array $actions;

    public function __construct(
        public readonly OverlayComponent $component,
    )
    {
        $this->actions = $this->resolveActions($component);
    }

    public function run(Overlay $overlay, string $action): mixed
    {
        $callback = $this->actions[$action] ?? null;

        if ($callback === null) {
            throw new RuntimeException("Action [{$action}] not found on overlay");
        }

        return app()->call($callback, [
            'overlay' => $overlay,
        ]);
    }

    # ----------[ OverlayComponent ]----------

    public function name(): string
    {
        return $this->component->name();
    }

    public function config(Overlay $overlay): OverlayConfig
    {
        return $this->component->config($overlay);
    }

    public function props(Overlay $overlay): array
    {
        return $this->props ??= $this->resolveProps($overlay);
    }

    # ----------[ Internal ]----------

    private function resolveProps(Overlay $overlay): array
    {
        return $this->component->props($overlay);
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