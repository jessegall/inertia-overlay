<?php

namespace JesseGall\InertiaOverlay;

use Closure;
use Illuminate\Support\Str;
use InvalidArgumentException;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use JesseGall\InertiaOverlay\Enums\OverlaySize;
use JesseGall\InertiaOverlay\Enums\OverlayVariant;
use JesseGall\InertiaOverlay\Header as OverlayHeader;

class OverlayBuilder
{

    protected array $createdCallbacks = [];

    # ----------[ Properties ]----------

    public string|null $id = null;
    public string|null $url = null;
    public array|null $props = [];

    public OverlayVariant|null $variant = null;
    public OverlaySize|null $size = null;
    public string|null $baseUrl = null;

    public OverlayComponent|string|null $component = null;

    public function __construct(
        public readonly ComponentFactory $componentFactory,
        public readonly ComponentRegistry $componentRegistrar,
    ) {}

    public static function new(): static
    {
        return app(static::class);
    }

    # ----------[ Setters ]----------

    public function setId(string $id)
    {
        $this->id = $id;
        return $this;
    }

    public function setUrl(string $url): self
    {
        $this->url = $url;
        return $this;
    }

    public function setBaseUrl(string $baseUrl): self
    {
        $this->baseUrl = $baseUrl;
        return $this;
    }

    public function setProps(array $props): self
    {
        $this->props = $props;
        return $this;
    }

    public function setVariant(OverlayVariant $variant): self
    {
        $this->variant = $variant;
        return $this;
    }

    public function setSize(OverlaySize $size): self
    {
        $this->size = $size;
        return $this;
    }

    public function setComponent(OverlayComponent|string $component): self
    {
        $this->component = $component;
        return $this;
    }

    # ----------[ Helpers ]----------

    public function baseRoute(string $routeName, array $parameters = []): self
    {
        $this->baseUrl = route($routeName, $parameters);
        return $this;
    }

    public function config(OverlayConfig $config): self
    {
        $this->variant = $config->variant;
        $this->size = $config->size;
        $this->baseUrl = $config->baseUrl;
        return $this;
    }

    public function drawer(): self
    {
        return $this->setVariant(OverlayVariant::DRAWER);
    }

    public function modal(): self
    {
        return $this->setVariant(OverlayVariant::MODAL);
    }

    # ----------[ Callbacks ]----------

    public function onCreated(Closure $callback): self
    {
        $this->createdCallbacks[] = $callback;
        return $this;
    }

    # ----------[ Build ]----------

    public function make(): Overlay
    {
        $request = request();

        $id = $this->id ?? request()->header(Header::OVERLAY_ID);

        if ($id && Overlay::exists($id)) {
            $overlay = Overlay::load($id);

            if ($overlay->session->metadata('path') === $request->path()) {
                return $overlay;
            } else {
                $id = null;
            }
        }

        $component = $this->resolveComponent();
        $props = $this->resolveProps($component);
        $url = $this->resolveUrl($props);

        $overlay = app(Overlay::class,
            [
                'parentId' => $request->header(Header::OVERLAY_PARENT),
                'id' => $id ?? Str::random(8),
                'url' => $url,
                'props' => $props,
                'component' => $component,
                'config' => new OverlayConfig(
                    variant: $this->variant ?? OverlayVariant::MODAL,
                    size: $this->size ?? OverlaySize::XL2,
                    baseUrl: $this->baseUrl,
                )
            ]
        );

        $overlay->session->set_metadata(
            [
                'timestamp' => time(),
                'referer' => request()->headers->get('referer'),
                'path' => ltrim(parse_url($url, PHP_URL_PATH), '/'),
            ]
        );

        foreach ($this->createdCallbacks as $callback) {
            $callback($overlay);
        }

        return $overlay;
    }

    public function render(OverlayComponent|string|null $component = null): OverlayResponse
    {
        if ($component != null) {
            $this->setComponent($component);
        }

        return $this->make()->render();
    }

    # ----------[ Internal ]----------

    protected function resolveComponent(): OverlayComponent
    {
        if (is_null($this->component)) {
            throw new InvalidArgumentException('No overlay component must be provided before building the overlay.');
        }

        if (is_string($this->component)) {
            return $this->buildComponent($this->component, $this->props ?? []);
        }

        return $this->component;
    }

    protected function resolveProps(OverlayComponent $component): ?array
    {
        if (is_object($this->component)) {
            return array_merge($this->props, get_object_vars($component));
        }

        return $this->props;
    }

    protected function resolveUrl(array $props = []): string
    {
        $request = request();

        if ($request->header(OverlayHeader::OVERLAY_ACTION)) {
            return route('inertia-overlay.overlay',
                [
                    ...$props,
                    'type' => $request->header(OverlayHeader::OVERLAY_COMPONENT)
                ]
            );
        } else {
            return $request->fullUrl();
        }
    }

    protected function buildComponent(string $component, array $props = []): OverlayComponent
    {
        if (class_exists($component) || $this->componentRegistrar->isAliasRegistered($component)) {
            return $this->componentFactory->make($component, $props);
        }

        return new PageOverlayComponent($component, $props);
    }

}