<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Pipeline\Pipeline;

readonly class OverlayFactory
{

    public function __construct(
        private OverlayRegistrar $registrar,
    ) {}

    public function make(string $overlayId): ContextAwareOverlay
    {
        [$type, $args] = $this->parseOverlayId($overlayId);
        $class = $this->registrar->resolveClass($type);
        $middleware = $this->resolveMiddleware($class);

        $context = new OverlayContext($overlayId, $class, $type, $args);

        $overlay = app(Pipeline::class)
            ->send($context)
            ->through($middleware)
            ->then(fn(OverlayContext $context) => $this->makeOverlay($context));

        return new ContextAwareOverlay(
            context: $context,
            delegate: $overlay,
        );
    }

    private function parseOverlayId(string $overlayId): array
    {
        if (! str_contains($overlayId, ':')) {
            return [$overlayId, []];
        }

        [$type, $encoded] = explode(':', $overlayId);
        $arguments = $this->parseOverlayArguments($encoded);
        return [$type, $arguments];
    }

    private function resolveMiddleware(string $class): array
    {
        if (is_a($class, SupportsMiddleware::class, true)) {
            return $class::middleware();
        }

        return [];
    }

    private function parseOverlayArguments(string $encodedArguments): mixed
    {
        $decoded = base64_decode($encodedArguments);
        $json = urldecode($decoded);
        return json_decode($json, true) ?? [];
    }

    private function makeOverlay(OverlayContext $context): mixed
    {
        if (is_subclass_of($context->class, '\Spatie\LaravelData\Data')) {
            return $context->class::from($context->args);
        }

        return app($context->class, $context->args);
    }

}