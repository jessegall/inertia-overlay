<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Request;

readonly class OverlaySession
{

    public string $key;

    public function __construct(
        public string $overlayId
    )
    {
        $this->key = self::key($overlayId);
    }

    public function setPage(array $page): void
    {
        session()->put("{$this->key}.page", $page);

        $this->mergeProps($page['props'][$this->overlayId]);
    }

    public function getPage(): array|null
    {
        return session()->get("{$this->key}.page");
    }

    public function meta(string $key, mixed $default = null): mixed
    {
        return session()->get("{$this->key}.page.overlay.{$key}", $default);
    }

    public function props(string|null $key = null): mixed
    {
        if ($key) {
            return session()->get("{$this->key}._props.{$key}");
        }

        return session()->get("{$this->key}._props", []);
    }

    public function put(string $key, mixed $value): void
    {
        session()->put("{$this->key}.{$key}", $value);
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return session()->get("{$this->key}.{$key}", $default);
    }

    public function flash(string $key, mixed $value): void
    {
        session()->flash("{$this->key}.{$key}", $value);
    }

    # ----------[ Internal ]----------

    protected function mergeProps(array $props): void
    {
        $current = $this->props();
        $merged = array_merge($current, $props);
        session()->put("{$this->key}._props", $merged);
    }

    # ----------[ Static ]----------

    public static function load(string $overlayId): OverlaySession
    {
        return new static($overlayId);
    }

    public static function loadFromRequest(Request $request): OverlaySession
    {
        return new static($request->header(Header::OVERLAY_ID));
    }

    public static function exists(string $overlayId): bool
    {
        return session()->has(self::key($overlayId));
    }

    public static function key(string $overlayId): string
    {
        return "inertia-overlay.{$overlayId}";
    }

}