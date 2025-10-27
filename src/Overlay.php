<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Inertia\Support\Header as InertiaHeader;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use RuntimeException;

class Overlay
{

    private bool $isNew = false;

    public function __construct(
        public readonly Request $request,
        public readonly string $id,
        private array $props = [],
    ) {}

    public function render(OverlayComponent $component): OverlayResponse
    {
        $component = new OverlayComponentDecorator($component);

        if ($action = $this->getAction()) {
            $component->run($this, $action);
        }

        return new OverlayResponse($this, $component);
    }

    public function scopedKey(string $key): string
    {
        return "{$this->id}:{$key}";
    }

    public function unscopedKey(string $scopedKey): string
    {
        return str_replace("{$this->id}:", '', $scopedKey);
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

    public function refreshProps(array|string|null $keys = null): void
    {
        if ($this->get('refresh') === true) {
            return;
        }

        if ($keys === null) {
            $this->flash('refresh', true);
        } else {
            $current = $this->get('refresh', []);
            $this->flash('refresh', array_merge($current, Arr::wrap($keys)));
        }
    }

    # ----------[ Getters ]----------

    public function getAction(): string|null
    {
        return $this->request->header(Header::OVERLAY_ACTION);
    }

    public function getUrl(): string
    {
        return $this->request->header(Header::OVERLAY_URL, $this->request->url());
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

    public function getPartialProps(): array
    {
        return collect()
            ->merge(explode(',', $this->request->header(InertiaHeader::PARTIAL_ONLY, '')))
            ->map($this->unscopedKey(...))
            ->reject(fn($key) => $key === '__inertia-overlay__')
            ->values()
            ->all();
    }

    public function isOpening(): bool
    {
        return $this->isNew || filter_var($this->request->header(Header::OVERLAY_OPENING), FILTER_VALIDATE_BOOLEAN);
    }

    public function isRefocusing(): bool
    {
        return filter_var($this->request->header(Header::OVERLAY_REFOCUS), FILTER_VALIDATE_BOOLEAN);
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

    public static function new(array $props = []): static
    {
        $overlay = app(static::class,
            [
                'id' => Str::random(8),
                'props' => $props,
            ]
        );

        $overlay->isNew = true;

        return $overlay;
    }

    public static function fromRequest(Request $request): static|null
    {
        if (! $id = $request->header(Header::OVERLAY_ID)) {
            return null;
        }

        $overlay = app(static::class, [
            'id' => $id
        ]);

        if ($props = $request->get('_props')) {
            $overlay->props = $props;
        } else {
            $overlay->restoreProps();
        }

        $overlay->flashProps();

        return $overlay;
    }

}