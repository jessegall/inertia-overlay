<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class Overlay
{

    public function __construct(

        # ----------[ Dependencies ]----------

        public readonly ComponentFactory $componentFactory,
        public readonly OverlayActionRunner $actionRunner,
        public readonly Request $request,

        # ----------[ Input ]----------

        protected OverlayComponent|string $component,

        protected string $id,
        protected string $url,
        protected string $baseUrl,
        protected array $props = [],
        protected bool $isOpening = false,
        protected OverlayConfig|null $config = null,

    ) {}

    public function render(): OverlayResponse
    {
        if (is_string($this->component)) {
            $component = $this->componentFactory->make($this->component, $this->props);
        } else {
            $component = $this->component;
        }

        if ($action = $this->request->header(Header::OVERLAY_ACTION)) {
            $this->actionRunner->run($this, $component, $action);
        }

        $config = $this->config ?? $component->config($this);

        return new OverlayResponse($this, $component, $config);
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
        $this->reloadProps(array_keys($props));
    }

    public function reloadProps(array|string $keys): void
    {
        $current = $this->get('reload', []);
        $this->flash('reload', array_merge($current, Arr::wrap($keys)));
    }

    public function getReloadProps(): array
    {
        return $this->get('reload', []);
    }

    public function reloadPageProps(array|string $keys): void
    {
        $current = $this->get('reloadPage', []);
        $this->flash('reloadPage', array_merge($current, Arr::wrap($keys)));
    }

    public function getReloadPageProps(): array
    {
        return $this->get('reloadPage', []);
    }

    public function scopePropKey(string $key): string
    {
        if ($this->isScopedKey($key)) {
            return $key;
        }

        return "{$this->id}.{$key}";
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

    public function isOpening(): bool
    {
        return $this->isOpening;
    }

    public function getBaseUrl(): string|null
    {
        return $this->baseUrl;
    }

    # ----------[ Session ]----------

    public function close(): void
    {
        $this->flash('close', true);
    }

    public function isCloseRequested(): bool
    {
        return $this->get('close', false) === true;
    }

    public function restoreProps(): void
    {
        $this->props = $this->get('props', []);
    }

    public function flashProps(): void
    {
        $this->flash('props', $this->props);
    }

    public function get(string|null $key = null, mixed $default = null): mixed
    {
        return session()->get($this->sessionKey($key), $default);
    }

    public function has(string $key): bool
    {
        return session()->has($this->sessionKey($key));
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

}