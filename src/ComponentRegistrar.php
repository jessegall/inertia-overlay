<?php

namespace JesseGall\InertiaOverlay;

use InvalidArgumentException;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class ComponentRegistrar
{

    private array $overlays = [];

    /**
     * Register an alias for an overlay component type
     *
     * @param string $alias
     * @param class-string<OverlayComponent> $type
     * @return void
     */
    public function register(string $alias, string $type): void
    {
        $this->assertIsOverlayComponentType($type);

        $this->overlays[$alias] = $type;
    }

    /**
     * Resolve the overlay class by alias
     *
     * @param string $alias
     * @return class-string<OverlayComponent>
     */
    public function resolveClass(string $alias): string
    {
        return $this->overlays[$alias]
            ?? throw new InvalidArgumentException("Overlay with id [$alias] not found");
    }

    /**
     * Resolve the overlay alias by class
     *
     * @param string $class
     * @return string
     */
    public function resolveAlias(string $class): string
    {
        return array_search($class, $this->overlays)
            ?? throw new InvalidArgumentException("Overlay with class [$class] not found");
    }

    /**
     * Check if an overlay type is registered
     *
     * @param string $alias
     * @return bool
     */
    public function isAliasRegistered(string $alias): bool
    {
        return isset($this->overlays[$alias]);
    }

    /**
     * Check if an overlay class is registered
     *
     * @param string $class
     * @return bool
     */
    public function isClassRegistered(string $class): bool
    {
        return in_array($class, $this->overlays, true);
    }

    /**
     * @param string $type
     * @return void
     */
    public function assertIsOverlayComponentType(string $type): void
    {
        if (! is_subclass_of($type, OverlayComponent::class)) {
            throw new InvalidArgumentException(
                sprintf(
                    "Overlay must be an instance of %s [%s] given.",
                    OverlayComponent::class,
                    $type
                )
            );
        }
    }

}