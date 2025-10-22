<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Arrayable;
use Inertia\IgnoreFirstLoad;
use RuntimeException;

class ContextAwareOverlay implements Overlay
{

    private array|null $props = null;

    public function __construct(
        public readonly OverlayContext $context,
        public readonly Overlay $delegate
    ) {}

    public function variant(): OverlayVariant
    {
        return $this->delegate->variant();
    }

    public function size(): OverlaySize
    {
        return $this->delegate->size();
    }

    public function props(): array
    {
        if ($this->props === null) {
            $props = $this->delegate->props();

            if ($props instanceof Arrayable) {
                $props = $props->toArray();
            }

            $this->props = $props;
        }

        return $this->props;
    }

    public function keys(bool $excludeFirstLoad = false): array
    {
        return collect($this->props())
            ->filter(fn($value) => ! $excludeFirstLoad || ! $value instanceof IgnoreFirstLoad)
            ->keys()
            ->all();
    }

    public static function fallbackUrl(): string
    {
        throw new RuntimeException('ContextAwareOverlay does not support fallbackUrl.');
    }

}