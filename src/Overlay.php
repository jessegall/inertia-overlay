<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;

class Overlay
{

    public readonly OverlaySession $session;
    public bool $initializing = false;

    public function __construct(
        public readonly Request $request,
        public readonly OverlayConfig $config,
        public readonly OverlayComponent $component,
        public readonly string $id,
        public readonly string $url,
        public array $props,
    )
    {
        $this->session = new OverlaySession($this);
    }

    public function render(): OverlayResponse
    {
        return new OverlayResponse($this, $this->component);
    }

    public function append(array $props): void
    {
        $current = $this->session->get('append', []);
        $this->session->flash('append', array_merge($current, $props));
    }

    public function reloadOverlay(array|string $keys = '*'): void
    {
        $current = $this->session->get('reload.overlay', []);
        $this->session->flash('reload.overlay', array_merge($current, Arr::wrap($keys)));
    }

    public function reloadPage(array|string $keys = '*'): void
    {
        $current = $this->session->get('reload.page', []);
        $this->session->flash('reload.page', array_merge($current, Arr::wrap($keys)));
    }

    public function mergeProps(array $props)
    {
        $this->props = array_merge($this->props, $props);
    }

    public function restoreProps(): void
    {
        $this->props = $this->session->get('props', []);
    }

    public function scopeKey(mixed $key): string
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

    public function getBaseUrl(): string|null
    {
        return $this->config->baseUrl;
    }

    public function getProps(): array
    {
        return $this->props;
    }

    public function isInitializing(): bool
    {
        return $this->initializing;
    }

    public function getConfig(): OverlayConfig
    {
        return $this->config;
    }

    public function getProp(string $key, mixed $default = null): mixed
    {
        return Arr::get($this->props, $key, $default);
    }

    public function getAppendedProps(): array
    {
        return $this->session->get('append', []);
    }

    public function getReloadedOverlayKeys(): array
    {
        return $this->session->get('reload.overlay', []);
    }

    public function getReloadedPageKeys(): array
    {
        return $this->session->get('reload.page', []);
    }

    public function getAppendedPropKeys(): array
    {
        return array_keys($this->session->get('append', []));
    }

    # ----------[ Session ]----------

    public function close(): void
    {
        $this->session->flash('close', true);
    }

    public function isCloseRequested(): bool
    {
        return $this->session->get('close', false);
    }

}