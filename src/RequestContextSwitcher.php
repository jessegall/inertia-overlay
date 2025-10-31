<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;

readonly class RequestContextSwitcher
{



    public function __construct(
        private Request $from,
        private Request $to
    ) {}

    public function switch(Closure $callback): mixed
    {
        try {
            app()->instance('request', $this->to);
            return $callback($this, $this->to);
        } finally {
            app()->instance('request', $this->from);
        }
    }

    public static function new(Request $from, Request $to): static
    {
        return new static($from, $to);
    }

}