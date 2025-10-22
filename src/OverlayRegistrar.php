<?php

namespace JesseGall\InertiaOverlay;

use InvalidArgumentException;

class OverlayRegistrar
{

    private array $overlays = [];

    /**
     * Register an overlay type
     * 
     * @param string $typename
     * @param class-string<OverlayComponent> $type
     * @return void
     */
    public function register(string $typename, string $type): void
    {
        $this->assertIsOverlayType($type);

        $this->overlays[$typename] = $type;
    }

    /**
     * Resolve the overlay type by id
     *
     * @param string $typename
     * @return class-string<OverlayComponent>
     */
    public function resolveComponentClass(string $typename): string
    {
        return $this->overlays[$typename] ?? throw new InvalidArgumentException("Overlay with id [$typename] not found");
    }

    /**
     * @param string $class
     * @return string
     */
    public function resolveTypename(string $class): string
    {
        return array_search($class, $this->overlays) ?? throw new InvalidArgumentException("Overlay with class [$class] not found");
    }

    /**
     * @param string $type
     * @return void
     */
    private function assertIsOverlayType(string $type): void
    {
        if (! is_subclass_of($type, OverlayComponent::class)) {
            throw new InvalidArgumentException("Overlay must be an instance of " . OverlayComponent::class);
        }
    }

}