<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\RedirectResponse;
use RuntimeException;

class OverlayRedirectResponse extends RedirectResponse
{

    public function __construct(
        public string $component,
        public array $props = []
    )
    {
        $type = $this->resolveComponentType($component);
        $url = $this->buildOverlayUrl($type, $props);

        parent::__construct($url);
    }

    private function resolveComponentType(string $component): string
    {
        $registrar = app(OverlayComponentRegistrar::class);

        if (class_exists($component)) {
            if ($registrar->isClassRegistered($component)) {
                return $registrar->resolveAlias($component);
            }

            return base64_encode($component);
        }

        if (! $registrar->isAliasRegistered($component)) {
            throw new RuntimeException("No overlay component registered with alias [$component].");
        }

        return $component;
    }


    private function buildOverlayUrl(string $type, array $props): string
    {
        $queryParams = [
            ...$props,
            '_props' => implode(',', array_keys($props))
        ];

        return "/overlay/$type?" . http_build_query($queryParams);
    }


}