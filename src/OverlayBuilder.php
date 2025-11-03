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
        protected ComponentRegistry $componentRegistrar,
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

        if ($id && OverlaySession::exists($id)) {
            $overlay = OverlaySession::load($id);

            if ($overlay->session->metadata('request_url') === $request->url()) {
                $overlay->mergeProps($this->props ?? []);
                return $overlay;
            } else {
                $id = null;
            }
        }

        $url = $this->resolveUrl();
        $component = $this->resolveComponent();

        $overlay = app(Overlay::class,
            [
                'id' => $id ?? Str::random(8),
                'url' => $url,
                'props' => [...$this->props, ...get_object_vars($component)],
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
                'time' => time(),
                'component_class' => get_class($component),
                'request_referer' => request()->headers->get('referer'),
                'request_url' => $url,
                'request_full_url' => request()->fullUrl(),
                'request_method' => request()->method(),
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


    protected function buildComponent(string $component, array $props = []): OverlayComponent
    {
        if (class_exists($component) || $this->componentRegistrar->isAliasRegistered($component)) {
            return $this->componentFactory->make($component, $props);
        }

        return new PageOverlayComponent($component, $props);
    }

    protected function resolveComponent(): OverlayComponent
    {
        if (is_null($this->component)) {
            throw new InvalidArgumentException('Overlay component must be provided either via setComponent() method.');
        }

        $component = $this->component;

        if (is_string($component)) {
            $component = $this->buildComponent($component, $this->props ?? []);
        }

        return $component;
    }

    protected function resolveUrl(): string
    {
        $request = request();

        // TODO: Finding a better solution for resolving action URLs
        if ($request->header(OverlayHeader::OVERLAY_ACTION)) {
            return route('inertia-overlay.overlay',
                [
                    ...$this->props,
                    'type' => $request->header(OverlayHeader::OVERLAY_COMPONENT)
                ]
            );
        } else {
            return $request->fullUrl();
        }
    }
}