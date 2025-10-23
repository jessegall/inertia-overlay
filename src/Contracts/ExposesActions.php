<?php

namespace JesseGall\InertiaOverlay\Contracts;

interface ExposesActions
{

    /**
     * @return array<string, callable>
     */
    public function actions(): array;

}