<?php

use JesseGall\InertiaOverlay\Http\OverlayRedirectResponse;

if (! function_exists('overlay')) {

    /**
     * Create an overlay redirect response.
     *
     * @param string $type The overlay class or registered type name.
     * @param array $args Optional arguments to pass to the overlay.
     * @return OverlayRedirectResponse
     */
    function overlay(string $type, array $args = []): OverlayRedirectResponse
    {
        if (class_exists($type)) {
            return OverlayRedirectResponse::fromClass($type, $args);
        } else {
            return OverlayRedirectResponse::fromTypename($type, $args);
        }
    }

}
