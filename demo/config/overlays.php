<?php

return [
    'overlay_class_map' => [
        'demo.modal' => App\Http\Overlays\DemoModal::class,
        'demo.drawer' => App\Http\Overlays\DemoDrawerOverlay::class,
        'route' => JesseGall\InertiaOverlay\RouteOverlayComponent::class,
    ]
];