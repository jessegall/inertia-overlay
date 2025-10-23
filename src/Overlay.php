<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Request;
use Illuminate\Pipeline\Pipeline;
use JesseGall\InertiaOverlay\Contracts\AppliesMiddleware;
use JesseGall\InertiaOverlay\Contracts\ExposesActions;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlayState;
use JesseGall\InertiaOverlay\Http\OverlayResponse;
use ReflectionClass;
use ReflectionMethod;

readonly class Overlay
{

    private OverlayComponent $component;
    private array $actions;

    public function __construct(
        public Request $request,
    )
    {
        [$typename, $arguments] = $this->parseOverlayId($this->getId());
        $this->component = $this->resolveComponent($typename, $arguments);
        $this->actions = $this->resolveActions($this->component);
    }

    public function run(string $action): mixed
    {
        return app()->call($this->actions[$action]);
    }

    public function render(): OverlayResponse
    {
        return new OverlayResponse(
            overlay: $this,
            config: $this->component->config($this),
            props: $this->component->props($this),
            actions: $this->actions,
        );
    }

    # ----------[ Headers ]----------

    public function getId(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_ID);
    }

    public function getInstanceId(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_INSTANCE_ID);
    }

    public function getAction(): string|null
    {
        return $this->request->header(InertiaOverlay::OVERLAY_ACTION);
    }

    public function getParentId(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_PARENT_ID);
    }

    public function getIndex(): int
    {
        return (int)$this->request->header(InertiaOverlay::OVERLAY_INDEX);
    }

    public function getRootUrl(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_ROOT_URL);
    }

    public function getPageComponent(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_PAGE_COMPONENT);
    }

    public function getState(): OverlayState
    {
        return OverlayState::from($this->request->header(InertiaOverlay::OVERLAY_STATE));
    }

    public function hasState(OverlayState $state): bool
    {
        return $this->getState() === $state;
    }

    public function isFocused(): bool
    {
        return filter_var($this->request->header(InertiaOverlay::OVERLAY_FOCUSED), FILTER_VALIDATE_BOOLEAN);
    }

    public function isBlurred(): bool
    {
        return ! $this->isFocused();
    }

    # ----------[ Session ]----------

    public function isRefreshRequested(): bool
    {
        return session()->get('inertia.overlay.refresh') === $this->getId();
    }

    public function refresh(): void
    {
        session()->flash('inertia.overlay.refresh', $this->getId());
    }

    # ----------[ Parsing ]----------

    private function parseOverlayId(string $overlayId): array
    {
        $segments = explode(':', $overlayId);

        $typename = $segments[0];

        $encodedArguments = $segments[1] ?? '';
        $arguments = $this->parseEncodedArguments($encodedArguments);

        return [$typename, $arguments];
    }

    private function parseEncodedArguments(string $encodedArguments): mixed
    {
        $decoded = base64_decode($encodedArguments);
        $json = rawurldecode($decoded);
        return json_decode($json, true) ?? [];
    }

    # ----------[ Component ]----------

    /**
     * @param string $typename
     * @param array $arguments
     * @return OverlayComponent
     */
    private function resolveComponent(string $typename, array $arguments = []): OverlayComponent
    {
        $class = app(OverlayRegistrar::class)->resolveComponentClass($typename);

        $middleware = $this->resolveComponentMiddleware($class);

        return app(Pipeline::class)
            ->send($this)
            ->through($middleware)
            ->then(fn() => $this->newComponent($class, $arguments));
    }

    /**
     * @param class-string<OverlayConfig> $class
     */
    private function resolveComponentMiddleware(string $class): array
    {
        if (is_subclass_of($class, AppliesMiddleware::class)) {
            return $class::middleware();
        }

        return [];
    }

    /**
     * @param class-string<OverlayComponent> $class
     * @param array $arguments
     * @return OverlayComponent
     */
    private function newComponent(string $class, array $arguments): OverlayComponent
    {
        if (is_subclass_of($class, 'Spatie\\LaravelData\\Data')) {
            return $class::from($arguments);
        }

        return app($class, $arguments);
    }

    /**
     * @param OverlayComponent $component
     * @return array<string, callable>
     */
    private function resolveActions(OverlayComponent $component): array
    {
        $reflector = new ReflectionClass($component);

        return collect($reflector->getMethods())
            ->filter(fn(ReflectionMethod $method) => $method->getAttributes(OverlayAction::class))
            ->mapWithKeys(function (ReflectionMethod $method) use ($component) {
                [$attribute] = $method->getAttributes(OverlayAction::class);
                $instance = $attribute->newInstance();
                return [$instance->name => $method->getClosure($component)];
            })
            ->all();
    }

}