<?php

namespace JesseGall\InertiaOverlay;

use Arr;
use Illuminate\Contracts\Support\Arrayable;

class OverlayInput implements Arrayable
{

    /**
     * @param array $arguments
     */
    public function __construct(
        private array $arguments = [],
    ) {}

    public function get(string|null $key = null, mixed $default = null): mixed
    {
        if (is_null($key)) {
            return $this->arguments;
        }

        return Arr::get($this->arguments, $key, $default);
    }

    public function has(string $key): bool
    {
        return Arr::has($this->arguments, $key);
    }

    public function toArray(): array
    {
        return $this->arguments;
    }

}