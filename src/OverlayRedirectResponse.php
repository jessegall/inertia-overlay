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
        $type = $this->resolveTypeArgument($component);

        parent::__construct("/overlay/$type?" . http_build_query($props));
    }

    private function resolveTypeArgument(string $component): string
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

}