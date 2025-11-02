<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Response;

readonly class InitialOverlayResponse
{

    public function __construct(
        public Response $original,
        public array $data,
    ) {}

}