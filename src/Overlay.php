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

class Overlay
{

    private OverlayComponent|null $component = null;

    /**
     * The overlay component typename.
     *
     * @var string
     */
    public readonly string $typename;

    /**
     * The arguments passed to the overlay component.
     *
     * @var array|mixed
     */
    public array $arguments;

    /**
     * The overlay component class.
     *
     * @var class-string<OverlayConfig>
     */
    public readonly string $class;

    public function __construct(
        private readonly Request $request,
    )
    {
        [$this->typename, $this->arguments] = $this->parseOverlayId($this->getId());
        $this->class = $this->resolveComponentClass($this->typename);
    }

    # ----------[ Resolve ]----------

    private function resolve(): OverlayComponent
    {
        if ($this->component !== null) {
            return $this->component;
        }

        $middleware = $this->resolveComponentMiddleware($this->class);

        return $this->component = app(Pipeline::class)
            ->send($this)
            ->through($middleware)
            ->then(fn(Overlay $overlay) => $overlay->createComponent(
                $overlay->class,
                $overlay->arguments
            ));
    }

    # ----------[ Response ]----------

    public function render(): OverlayResponse
    {
        $component = $this->resolve();
        $actions = $this->resolveActions($component);

        return new OverlayResponse(
            overlay: $this,
            config: $component->config($this),
            props: $component->props($this),
            actions: $actions,
        );
    }

    # ----------[ Actions ]----------

    public function run(string $action): mixed
    {
        $component = $this->resolve();
        $actions = $this->resolveActions($component);
        return app()->call($actions[$action]);
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

    public function hydrateRequested(): bool
    {
        return session()->get('inertia.overlay.hydrate') === $this->getId();
    }

    public function hydrate(): void
    {
        session()->flash('inertia.overlay.hydrate', $this->getId());
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
     * @return  class-string<OverlayConfig>
     */
    private function resolveComponentClass(string $typename): string
    {
        return app(OverlayRegistrar::class)->resolveComponentClass($typename);
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
    private function createComponent(string $class, array $arguments): OverlayComponent
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