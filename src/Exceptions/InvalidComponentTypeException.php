<?php

namespace JesseGall\InertiaOverlay\Exceptions;

use InvalidArgumentException;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class InvalidComponentTypeException extends InvalidArgumentException
{

    public function __construct(string $type)
    {
        parent::__construct(
            sprintf(
                'The class [%s] is not a valid OverlayComponent. It must implement the interface [%s].',
                $type,
                OverlayComponent::class
            )
        );
    }

}