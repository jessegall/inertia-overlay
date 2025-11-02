<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class Overlay
{

    public function __construct(
        protected string $id,
        protected string $url,
        protected string $baseUrl,
        protected array $props = [],
        protected bool $isInitializing = false,
        protected OverlayConfig|null $config = null,
    ) {}

    public function render(OverlayComponent $component): OverlayResponse
    {
        $this->session()->put('render.component', get_class($component));

        $config = $this->config ?? $component->config($this);

        return new OverlayResponse($this, $component, $config);
    }

    public function append(array $props): void
    {
        $current = $this->session()->get('append', []);
        $this->session()->flash('append', array_merge($current, $props));
    }

    public function only(array|string $keys): void
    {
        $current = $this->session()->get('overlay.only', []);
        $this->session()->flash('overlay.only', array_merge($current, Arr::wrap($keys)));
    }

    public function reloadPage(array|string $keys): void
    {
        $current = $this->session()->get('page.include', []);
        $this->session()->flash('page.include', array_merge($current, Arr::wrap($keys)));
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

    public function getUrl(): string
    {
        return $this->url;
    }

    public function isInitializing(): bool
    {
        return $this->isInitializing;
    }

    public function getBaseUrl(): string|null
    {
        return $this->baseUrl;
    }

    public function getProps(): array
    {
        return $this->props;
    }

    public function getProp(string $key, mixed $default = null): mixed
    {
        return Arr::get($this->props, $key, $default);
    }

    public function getOnly(): array
    {
        return $this->session()->get('overlay.only', []);
    }

    public function getPageInclude(): array
    {
        return $this->session()->get('page.include', []);
    }

    # ----------[ Session ]----------

    public function session(): OverlaySession
    {
        return OverlaySession::load($this->id);
    }

    public function close(): void
    {
        $this->session()->flash('close', true);
    }

    public function isCloseRequested(): bool
    {
        return $this->session()->get('close', false);
    }

}