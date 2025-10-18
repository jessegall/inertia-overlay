<?php

namespace JesseGall\InertiaOverlay;

class OverlayContext
{

    /**
     * @param string $overlayId
     * @param class-string<Overlay> $class
     * @param string $type
     * @param array $args
     */
    public function __construct(
        public string $overlayId,
        public string $class,
        public string $type,
        public array $args = [],
    ) {}

    public function getArgument(string $key): mixed
    {
        return data_get($this->args, $key);
    }

    public function hasArgument(string $key): bool
    {
        return array_key_exists($key, $this->args);
    }

    public function setArgument(string $key, mixed $value): void
    {
        $this->args[$key] = $value;
    }

    public function isOpening(): bool
    {
        return request()->header('X-Inertia-Overlay-Opening-Id') === $this->overlayId;
    }

    public function isClosing(): bool
    {
        return request()->header('X-Inertia-Overlay-Closing-Id') === $this->overlayId;
    }

    public function isActive(): bool
    {
        if ($this->isOpening() || $this->isClosing()) {
            return false;
        }

        return request()->header('X-Inertia-Overlay-Id') === $this->overlayId;
    }

    public function index(): int
    {
        return (int)request()->header('X-Inertia-Overlay-Index');
    }

    public function rootUrl(): string|null
    {
        return request()->header('X-Inertia-Overlay-Root-Url');
    }

    public function previousUrl(): string|null
    {
        return request()->header('X-Inertia-Overlay-Previous-Url');
    }

    public function pageComponent(): string|null
    {
        return request()->header('X-Inertia-Overlay-Page-Component');
    }


}