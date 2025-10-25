<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlayState;
use JesseGall\InertiaOverlay\Http\OverlayResponse;

class Overlay
{
    
    public function __construct(
        public Request $request,
        public string $id,
        public string $url,
        public array $data = [],
    ) {}

    public function render(OverlayComponent $component): OverlayResponse
    {
        $component = new OverlayComponentDecorator($component);

        if ($action = $this->getAction()) {
            $component->run($this, $action);
        }

        return new OverlayResponse(
            overlay: $this,
            component: $component,
        );
    }

    public function reset(): void
    {
        $this->forget('refresh');
    }

    # ----------[ Request Headers ]----------

    public function getAction(): string|null
    {
        return $this->request->header(Header::OVERLAY_ACTION);
    }

    public function getBaseUrl(): string
    {
        return $this->request->header(Header::OVERLAY_ROOT_URL, '/');
    }

    public function getPageComponent(): string|null
    {
        return $this->request->header(Header::OVERLAY_PAGE_COMPONENT);
    }

    public function getRequestCounter(): int
    {
        return (int)$this->request->header(Header::OVERLAY_REQUEST_COUNTER);
    }

    public function hasRequestCounter(int $counter): bool
    {
        return $this->getRequestCounter() === $counter;
    }

    public function isRefocusing(): bool
    {
        return filter_var($this->request->header(Header::OVERLAY_REFOCUS), FILTER_VALIDATE_BOOLEAN);
    }

    public function getState(): OverlayState
    {
        return OverlayState::from($this->request->header(Header::OVERLAY_STATE, 'closed'));
    }

    public function hasState(OverlayState $state): bool
    {
        return $this->getState() === $state;
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

    public function isFullRefreshRequested(): bool
    {
        return $this->get('refresh') === true;
    }

    public function getRefreshProps(): array|bool
    {
        return $this->get('refresh', false);
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

    public static function new(): static
    {
        return app(static::class,
            [
                'id' => Str::random(8),
                'url' => url()->current(),
            ]
        );
    }

    public static function fromRequest(Request $request): static
    {
        return app(static::class,
            [
                'id' => $request->header(Header::OVERLAY_ID),
                'url' => $request->header(Header::OVERLAY_URL),
            ]
        );
    }

}