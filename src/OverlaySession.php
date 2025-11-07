<?php

namespace JesseGall\InertiaOverlay;

readonly class OverlaySession
{

    public string $handle;

    public function __construct(
        public Overlay $overlay
    )
    {
        $this->handle = self::handle($this->overlay->id);
    }

    public function save(array $page): void
    {
        $this->put('id', $this->overlay->id);
        $this->put('url', $this->overlay->url);
        $this->put('props', [...$this->overlay->props, ...$page['props'][$this->overlay->id] ?? []]);
        $this->put('config', $this->overlay->config);
        $this->put('component', get_class($this->overlay->component));
    }

    # ----------[ Session ]----------

    public function put(string $key, mixed $value): void
    {
        $this->session('put', $key, $value);
    }

    public function has(string|null $key = null): bool
    {
        return $this->session('has', $key);
    }

    public function get(string|null $key = null, mixed $default = null): mixed
    {
        return $this->session('get', $key, $default);
    }

    public function flash(string|null $key = null, mixed $value = null): void
    {
        $this->session('flash', $key, $value);
    }

    protected function session(string $method, string|null $key = null, mixed ...$args): mixed
    {
        return session()->{$method}(
            $key ? "{$this->handle}.{$key}" : "{$this->handle}",
            ...$args
        );
    }

    # ----------[ Static ]----------

    public static function flush(): void
    {
        session()->forget('inertia-overlay');
    }

    public static function exists(string $id): bool
    {
        return session()->has(self::handle($id));
    }

    public static function load(string $id): array|null
    {
        return session(self::handle($id));
    }

    public static function handle(string $overlayId): string
    {
        return "inertia-overlay.{$overlayId}";
    }

    # ----------[ Metadata ]----------

    public function metadata(string $key, mixed $default = null): mixed
    {
        return $this->get("__metadata.{$key}", $default);
    }

    public function set_metadata(string|array $key, mixed $value = null): void
    {
        if (is_array($key)) {
            foreach ($key as $k => $v) {
                $this->set_metadata($k, $v);
            }
        } else {
            $this->put("__metadata.{$key}", $value);
        }
    }


}