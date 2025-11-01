<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use Laravel\SerializableClosure\SerializableClosure;

class Overlay
{

    public function __construct(
        protected string $id,
        protected string $url,
        protected string $baseUrl,
        protected bool $isOpening = false,
        protected array $initialProps = [],
        protected OverlayConfig|null $config = null,
    ) {}

    public function render(OverlayComponent $component): OverlayResponse
    {
        $config = $this->config ?? $component->config($this);

        return new OverlayResponse($this, $component, $config);
    }

    public function append(array $props): void
    {
        $current = $this->get('append', []);
        $this->flash('append', array_merge($current, $props));
    }

    public function only(array|string $keys): void
    {
        $current = $this->get('overlay.only', []);
        $this->flash('overlay.only', array_merge($current, Arr::wrap($keys)));
    }

    public function includePage(array|string $keys): void
    {
        $current = $this->get('page.include', []);
        $this->flash('page.include', array_merge($current, Arr::wrap($keys)));
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

    public function isOpening(): bool
    {
        return $this->isOpening;
    }

    public function getBaseUrl(): string|null
    {
        return $this->baseUrl;
    }

    public function getInitialProps(): array
    {
        return $this->initialProps;
    }

    public function getOnly(): array
    {
        return $this->get('overlay.only', []);
    }

    public function getPageInclude(): array
    {
        return $this->get('page.include', []);
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

    public function get(string|null $key = null, mixed $default = null): mixed
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

    public function saveToSession(OverlayComponent $component): void
    {
        $self = clone $this;
        $self->isOpening = false;

        $component = is_subclass_of($component, 'Spatie\\LaravelData\\Data')
            ? get_class($component)
            : $component;

        session()->put($self->sessionKey('instance'), serialize(new SerializableClosure(fn() => [$self, $component])));
    }

    /** @return array{0: Overlay, 1: class-string<OverlayComponent>}|null */
    public static function fromSession(string $id)
    {
        $data = session()->get("overlay.{$id}.instance");
        $data = unserialize($data);

        if (! $data instanceof SerializableClosure) {
            return null;
        }

        return $data->getClosure()();
    }

}