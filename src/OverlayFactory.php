<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Pipeline\Pipeline;

readonly class OverlayFactory
{

    public function __construct(
        private OverlayRegistrar $registrar,
    ) {}

    # ----------[ Api ]----------

    public function makeFromId(string $overlayId): ContextAwareOverlay
    {
        [$typename, $args] = $this->parseOverlayId($overlayId);
        $class = $this->registrar->resolveClass($typename);

        return $this->make(
            new OverlayContext($overlayId, $typename, $class, $args)
        );
    }

    public function makeFromClass(string $class, array $args = []): ContextAwareOverlay
    {
        $typename = $this->registrar->resolveTypename($class);
        $overlayId = $this->generateOverlayId($typename, $args);

        return $this->make(
            new OverlayContext($overlayId, $typename, $class, $args)
        );
    }

    public function makeFromTypename(string $typename, array $args = []): ContextAwareOverlay
    {
        $class = $this->registrar->resolveClass($typename);
        $overlayId = $this->generateOverlayId($typename, $args);

        return $this->make(
            new OverlayContext($overlayId, $typename, $class, $args)
        );
    }

    public function make(OverlayContext $context): ContextAwareOverlay
    {
        $overlay = app(Pipeline::class)
            ->send($context)
            ->through($context->getMiddleware())
            ->then(fn(OverlayContext $context) => $this->newOverlayInstance($context));

        return new ContextAwareOverlay($context, $overlay);
    }

    public function generateOverlayId(string $typename, array $args): string
    {
        if (empty($args)) {
            return $typename;
        }

        $json = json_encode($args);
        $encoded = rawurlencode($json);
        $base64 = base64_encode($encoded);

        return $typename . ':' . $base64;
    }

    # ----------[ Internal ]----------

    private function parseOverlayId(string $overlayId): array
    {
        if (! str_contains($overlayId, ':')) {
            return [$overlayId, []];
        }

        [$typename, $encoded] = explode(':', $overlayId);
        $arguments = $this->parseEncodedArguments($encoded);

        return [$typename, $arguments];
    }

    private function parseEncodedArguments(string $encodedArguments): mixed
    {
        $decoded = base64_decode($encodedArguments);
        $json = rawurldecode($decoded);
        return json_decode($json, true) ?? [];
    }

    private function newOverlayInstance(OverlayContext $context): mixed
    {
        if (is_subclass_of($context->class, '\\Spatie\\LaravelData\\Data')) {
            return $context->class::from($context->args);
        }

        return app($context->class, $context->args);
    }

}