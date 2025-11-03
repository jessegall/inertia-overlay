<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Contracts\Support\Responsable;
use JesseGall\InertiaOverlay\Contracts\OverlayComponent;
use Symfony\Component\HttpFoundation\Response;

readonly class OverlayRenderer implements Responsable
{

    public OverlayComponent $component;

    public function __construct(

        # ----------[ Dependencies ]----------

        protected ComponentRegistry $componentRegistrar,
        protected ComponentFactory $componentFactory,

        # ----------[ Input ]----------

        public Overlay $overlay,
        OverlayComponent|string $component,
    )
    {
        if (is_string($component)) {
            $component = $this->buildComponent($component, $this->overlay->getProps());
        }

        $this->component = $component;
    }

    public function render(): OverlayResponse
    {
        $this->overlay->session->set_metadata('component_class', get_class($this->component));
        $this->overlay->mergeProps(get_object_vars($this->component));

        return new OverlayResponse($this->overlay, $this->component);
    }

    public function toResponse($request): Response
    {
        return $this->render()->toResponse($request);
    }

    protected function buildComponent(string $component, array $props = []): OverlayComponent
    {
        if (class_exists($component) || $this->componentRegistrar->isAliasRegistered($component)) {
            return $this->componentFactory->make($component, $props);
        }

        return new PageOverlayComponent($component, $props);
    }

    # ----------[ Static ]----------

    public static function new(Overlay $overlay, OverlayComponent|string $component): static
    {
        return app(static::class,
            [
                'overlay' => $overlay,
                'component' => $component,
            ]
        );
    }

}