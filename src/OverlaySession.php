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

    public function save(): void
    {
        $this->set('id', $this->overlay->id);
        $this->set('url', $this->overlay->url);
        $this->set('props', $this->overlay->props);
        $this->set('config', $this->overlay->config);
    }

    # ----------[ Session ]----------

    public function set(string $key, mixed $value): void
    {
        session()->put("{$this->handle}.{$key}", $value);
    }

    public function has(string $key): bool
    {
        return session()->has("{$this->handle}.{$key}");
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return session()->get("{$this->handle}.{$key}", $default);
    }

    public function flash(string $key, mixed $value): void
    {
        session()->flash("{$this->handle}.{$key}", $value);
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

    public static function load(string $id): Overlay
    {
        /** @var Overlay $overlay */
        $overlay = app(Overlay::class, session(self::handle($id)));
        $overlay->restoreProps();
        return $overlay;
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
            return;
        }

        if ($this->has("__metadata.{$key}")) {
            return;
        }

        $this->set("__metadata.{$key}", $value);
    }


}