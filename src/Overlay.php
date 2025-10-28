<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use RuntimeException;

class Overlay
{

    protected bool $isOpening = false;
    protected bool $isRefocusing = false;

    public function __construct(
        public readonly Request $request,
        protected string $id,
        protected string $url,
        protected string $component,
        protected array $props = [],
    ) {}

    public function render(): OverlayResponse
    {
        if (! isset($this->component)) {
            throw new RuntimeException('Overlay component is not set.');
        }

        $component = $this->makeComponent($this->component, $this->props);

        if ($action = $this->request->header(Header::OVERLAY_ACTION)) {
            app(OverlayActionRunner::class)->run($this, $component, $action);
        }

        return new OverlayResponse($this, $component);
    }

    private function makeComponent(string $component, array $props): OverlayComponent
    {
        $factory = app(OverlayComponentFactory::class);
        $registrar = app(OverlayComponentRegistrar::class);

        if (class_exists($component)) {
            return $factory->make($component, $props);
        }

        if ($registrar->isRegistered($component)) {
            $component = $registrar->resolveComponentClass($component);
            return $factory->make($component, $props);
        }

        return new AnonymouseOverlayComponent($component, $props);
    }

    # ----------[ Props ]----------

    public function getProps(): array
    {
        return $this->props;
    }

    public function setProps(array $props): void
    {
        $this->props = $props;
        $this->flashProps();
    }

    public function mergeProps(array $props): void
    {
        $this->setProps(array_merge($this->props, $props));
    }

    public function appendProps(array $props): void
    {
        $this->mergeProps($props);
        $this->refreshProps(array_keys($props));
    }

    public function refreshProps(array|string $keys): void
    {
        $current = $this->get('refresh', []);
        $this->flash('refresh', array_merge($current, Arr::wrap($keys)));
    }

    public function scopePropKey(string $key): string
    {
        if ($this->isScopedKey($key)) {
            return $key;
        }

        return "{$this->id}:{$key}";
    }

    public function isScopedKey(string $key): bool
    {
        return Str::startsWith($key, "{$this->id}:");
    }

    # ----------[ Getters ]----------

    public function getId(): string
    {
        return $this->id;
    }

    public function getComponent(): string
    {
        return $this->component;
    }

    public function getUrl(): string
    {
        return $this->url;
    }

    public function getPageComponent(): string|null
    {
        return $this->request->header(Header::OVERLAY_PAGE_COMPONENT);
    }

    public function getRefreshProps(): array
    {
        $refresh = $this->get('refresh', []);

        if ($refresh === true) {
            return array_keys($this->props);
        } else if (is_array($refresh)) {
            return $refresh;
        }
    }


    public function isOpening(): bool
    {
        return $this->isOpening;
    }

    public function isRefocusing(): bool
    {
        return $this->isRefocusing;
    }

    public function urlIsMatch(string $url): bool
    {
        return parse_url($this->url, PHP_URL_PATH) === parse_url($url, PHP_URL_PATH);
    }

    # ----------[ Response Headers ]----------

    public function close(): void
    {
        $this->flash('close', true);
    }

    public function closeRequested(): bool
    {
        return $this->get('close', false) === true;
    }

    # ----------[ Session ]----------

    public function reset(): void
    {
        $this->forget('refresh');
    }

    public function restoreProps(): void
    {
        $this->props = $this->get('_props', []);
    }

    public function flashProps(): void
    {
        $this->flash('_props', $this->props);
    }

    public function get(string|null $key = null, mixed $default = null): mixed
    {
        return session()->get($this->sessionKey($key), $default);
    }

    public function has(string $key): bool
    {
        return session()->has($this->sessionKey($key));
    }

    public function pull(string $key, mixed $default = null): mixed
    {
        return session()->pull($this->sessionKey($key), $default);
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

    public function forget(string $key): void
    {
        session()->forget($this->sessionKey($key));
    }

    public function sessionKey(string|null $key = null): mixed
    {
        if ($key === null) {
            return "overlay.{$this->id}";
        }

        return "overlay.{$this->id}.{$key}";
    }

    # ----------[ Factory ]----------

    public static function new(string $component, array $props = []): static
    {
        $overlay = app(static::class,
            [
                'component' => $component,
                'id' => Str::random(8),
                'url' => request()->fullUrl(),
            ]
        );

        $overlay->isOpening = true;
        $overlay->setProps($props);

        return $overlay;
    }

    public static function fromRequest(Request $request, string $component, array $props = []): static
    {
        if (! $request->hasHeader(Header::INERTIA_OVERLAY)) {
            throw new RuntimeException('No overlay found in the request.');
        }

        $overlay = app(static::class,
            [
                'component' => $component,
                'id' => $request->header(Header::OVERLAY_ID),
                'url' => $request->header(Header::OVERLAY_URL, $request->fullUrl()),
            ]
        );

        $overlay->isOpening = $request->header(Header::OVERLAY_OPENING) === 'true';
        $overlay->isRefocusing = $request->header(Header::OVERLAY_REFOCUS) === 'true';

        $overlay->restoreProps();
        $overlay->mergeProps($props);
        $overlay->flashProps();

        return $overlay;
    }

}