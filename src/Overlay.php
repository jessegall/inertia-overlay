<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Pipeline\Pipeline;
use Illuminate\Support\Arr;
use JesseGall\InertiaOverlay\Contracts\AppliesMiddleware;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlayState;
use JesseGall\InertiaOverlay\Http\OverlayResponse;
use ReflectionClass;
use ReflectionMethod;
use RuntimeException;

readonly class Overlay
{

    public string $typename;
    public array $arguments;
    public OverlayComponent $component;
    public array $actions;

    public function __construct(
        public Request $request,
    )
    {
        [$this->typename, $this->arguments] = $this->parseOverlayId($this->getId());
        $this->component = $this->resolveComponent($this->typename, $this->arguments);
        $this->actions = $this->resolveActions($this->component);
    }

    public function run(string $action): mixed
    {
        if (! isset($this->actions[$action])) {
            throw new RuntimeException("Action '{$action}' not found on overlay '{$this->typename}'.");
        }

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

    public function reset(): void
    {
        $this->remove('refresh');
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

    public function getRequestCounter(): int
    {
        return (int)$this->request->header(InertiaOverlay::OVERLAY_REQUEST_COUNTER);
    }

    public function hasRequestCounter(int $counter): bool
    {
        return $this->getRequestCounter() === $counter;
    }

    public function isRefocusing(): bool
    {
        return filter_var($this->request->header(InertiaOverlay::OVERLAY_REFOCUS), FILTER_VALIDATE_BOOLEAN);
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
        return $this->get('refresh') !== null;
    }

    public function isFullRefreshRequested(): bool
    {
        return $this->get('refresh') === true;
    }

    public function getRefreshProps(): array|bool
    {
        return $this->get('refresh', true);
    }

    public function refresh(array|string|null $data = null): void
    {
        if ($data === null) {
            $this->flash('refresh', true);
        } elseif (! $this->isFullRefreshRequested()) {
            $current = $this->get('refresh', []);
            $this->flash('refresh', array_merge($current, Arr::wrap($data)));
        }
    }

    public function append(array $data): void
    {
        $this->flash('append', $data);
        $this->refresh(array_keys($data));
    }

    public function getAppendProps(): array
    {
        return $this->get('append', []);
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return session()->get($this->sessionKey($key), $default);
    }

    public function flash(string $key, mixed $value): void
    {
        session()->flash($this->sessionKey($key), $value);
    }

    public function put(string $key, mixed $value): void
    {
        session()->put($this->sessionKey($key), $value);
    }

    public function remember(string $key, mixed $value): mixed
    {
        if (! $value instanceof Closure) {
            $value = fn() => $value;
        }

        return session()->remember($this->sessionKey($key), $value);
    }

    public function remove(string $key): void
    {
        session()->remove($this->sessionKey($key));
    }

    public function sessionKey(string $key): mixed
    {
        return "overlay.{$this->getInstanceId()}.{$key}";
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