<?php

namespace JesseGall\InertiaOverlay;

use InvalidArgumentException;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class OverlayComponentRegistrar
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
        $this->assertIsOverlayComponentType($type);

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
        return $this->overlays[$typename]
            ?? throw new InvalidArgumentException("Overlay with id [$typename] not found");
    }

    /**
     * Resolve the overlay typename by class
     *
     * @param string $class
     * @return string
     */
    public function resolveTypename(string $class): string
    {
        return array_search($class, $this->overlays)
            ?? throw new InvalidArgumentException("Overlay with class [$class] not found");
    }

    /**
     * Check if an overlay type is registered
     *
     * @param string $typename
     * @return bool
     */
    public function isRegistered(string $typename): bool
    {
        return isset($this->overlays[$typename]);
    }

    /**
     * @param string $type
     * @return void
     */
    private function assertIsOverlayComponentType(string $type): void
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