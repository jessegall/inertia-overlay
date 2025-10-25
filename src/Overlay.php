<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlayState;
use JesseGall\InertiaOverlay\Http\OverlayResponse;

readonly class Overlay
{

    public OverlayInput $input;

    public function __construct(
        public Request $request,
        public string $id,
        public string $instanceId,
        public string $type,
        public array $data = [],
    )
    {
        $this->input = new OverlayInput($data);
    }

    public function render(OverlayComponent $component): OverlayResponse
    {
        return new OverlayResponse(
            overlay: $this,
            config: $component->config($this),
            props: $component->props($this),
        );
    }

    public function reset(): void
    {
        $this->remove('refresh');
    }

    # ----------[ Request Headers ]----------

    public function getAction(): string|null
    {
        return $this->request->header(Header::OVERLAY_ACTION);
    }

    public function getParentId(): string
    {
        return $this->request->header(Header::OVERLAY_PARENT_ID);
    }

    public function getIndex(): int
    {
        return (int)$this->request->header(Header::OVERLAY_INDEX);
    }

    public function getRootUrl(): string
    {
        return $this->request->header(Header::OVERLAY_ROOT_URL);
    }

    public function getPageComponent(): string
    {
        return $this->request->header(Header::OVERLAY_PAGE_COMPONENT);
    }

    public function setPageComponent(string $component): void
    {
        $this->request->headers->set(Header::OVERLAY_PAGE_COMPONENT, $component);
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

    public function isFocused(): bool
    {
        return filter_var($this->request->header(Header::OVERLAY_FOCUSED), FILTER_VALIDATE_BOOLEAN);
    }

    public function shouldForwardedToRoute(): bool
    {
        return $this->request->hasHeader(Header::INTERNAL_REQUEST);
    }

    public function isBlurred(): bool
    {
        return ! $this->isFocused();
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
        return "overlay.{$this->instanceId}.{$key}";
    }

    # ----------[ Factory ]----------

    public static function new(string|null $type, array $data = []): static
    {
        $idSegments = [
            app(OverlayComponentRegistrar::class)->resolveTypename($type),
            base64_encode(rawurlencode(json_encode($data))),
        ];

        return app(static::class,
            [
                'id' => implode(':', $idSegments),
                'instanceId' => Str::random(8),
                'type' => $type,
                'data' => $data,
            ]
        );
    }

    public static function fromRequest(Request $request): static
    {
        $segments = explode(':', $request->query('overlay', $request->header(Header::OVERLAY_ID)), 2);

        $typename = $segments[0];
        $encodedArguments = $segments[1] ?? '';
        $decoded = base64_decode($encodedArguments);
        $json = rawurldecode($decoded);
        $arguments = json_decode($json, true) ?? [];

        $type = app(OverlayComponentRegistrar::class)->resolveComponentClass($typename);

        return app(static::class, [
            'request' => $request,
            'id' => $request->query('overlay', $request->header(Header::OVERLAY_ID)),
            'instanceId' => $request->header(Header::OVERLAY_INSTANCE_ID),
            'type' => $type,
            'data' => $arguments,
        ]);
    }

}