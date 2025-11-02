<?php

namespace JesseGall\InertiaOverlay;

use InvalidArgumentException;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class ComponentRegistry
{

    /**
     * Registered overlay components
     *
     * @var array<string, class-string<OverlayComponent>>
     */
    private array $components = [];

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

        $this->components[$alias] = $type;
    }

    /**
     * Resolve the overlay class by alias
     *
     * @param string $alias
     * @return class-string<OverlayComponent>
     */
    public function resolveClass(string $alias): string
    {
        return $this->components[$alias]
            ?? throw new InvalidArgumentException("Overlay component with alias [$alias] not found");
    }

    /**
     * Resolve the overlay alias by class
     *
     * @param string $class
     * @return string
     */
    public function resolveAlias(string $class): string
    {
        return array_search($class, $this->components)
            ?? throw new InvalidArgumentException("Overlay component with class [$class] not found");
    }

    /**
     * Check if an overlay type is registered
     *
     * @param string $alias
     * @return bool
     */
    public function isAliasRegistered(string $alias): bool
    {
        return isset($this->components[$alias]);
    }

    /**
     * Check if an overlay class is registered
     *
     * @param string $class
     * @return bool
     */
    public function isClassRegistered(string $class): bool
    {
        return in_array($class, $this->components, true);
    }

    /**
     * @param string $type
     * @return void
     */
    public function assertIsOverlayComponentType(string $type): void
    {
        if (! is_subclass_of($type, OverlayComponent::class)) {
            throw new InvalidArgumentException(sprintf(
                "Class must be an instance of %s [%s] given.",
                OverlayComponent::class,
                $type
            ));
        }
    }

}