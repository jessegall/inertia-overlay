<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Support\Traits\ForwardsCalls;

/**
 * @mixin OverlayBuilder
 */
class HigherOrderBuildProxy
{
    use ForwardsCalls;

    public function __construct(
        private readonly OverlayBuilder $builder,
        private readonly Closure $callback,
    ) {}

    public function __call(string $method, array $parameters): mixed
    {
        $result = $this->forwardCallTo($this->builder, $method, $parameters);

        if ($result === $this->builder) {
            return $this;
        }

        return ($this->callback)(fn() => $result);
    }

}