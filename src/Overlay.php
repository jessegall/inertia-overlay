<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Http\OverlayResponse;

class Overlay
{

    private OverlayComponent|null $component = null;

    public readonly string $typename;
    public readonly array $arguments;

    public function __construct(
        private Request $request,
    )
    {
        [$this->typename, $this->arguments] = $this->parseOverlayId($this->getId());
    }

    public function render(): OverlayResponse
    {
        return new OverlayResponse($this);
    }

    public function flagRedirect(): void
    {
        session()->flash('inertia.overlay.redirected', $this->getId());
    }

    public function resolveComponent(): OverlayComponent
    {
        return $this->component ??= $this->makeComponent();
    }

    # ----------[ Headers ]----------

    public function getId(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_ID);
    }

    public function getParentId(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_PARENT_ID);
    }

    public function getIndex(): int
    {
        return (int)$this->request->header(InertiaOverlay::OVERLAY_INDEX);
    }

    public function getRootUrl(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_ROOT_URL);
    }

    public function getPageComponent(): string
    {
        return $this->request->header(InertiaOverlay::OVERLAY_PAGE_COMPONENT);
    }

    public function getState(): OverlayState
    {
        return OverlayState::from($this->request->header(InertiaOverlay::OVERLAY_STATE));
    }

    public function hasState(OverlayState $state): bool
    {
        return $this->getState() === $state;
    }

    public function isFocused(): bool
    {
        return filter_var($this->request->header(InertiaOverlay::OVERLAY_FOCUSED), FILTER_VALIDATE_BOOLEAN);
    }

    public function isBlurred(): bool
    {
        return ! $this->isFocused();
    }

    public function isRedirected(): bool
    {
        return session()->get('inertia.overlay.redirected') === $this->getId();
    }

    # ----------[ Parsing ]----------

    private function parseOverlayId(string $overlayId): array
    {
        $segments = explode(':', $overlayId);

        $typename = $segments[0];

        $encodedArguments = $segments[1] ?? '';
        $arguments = $this->parseEncodedArguments($encodedArguments);

        return [$typename, $arguments];
    }

    private function parseEncodedArguments(string $encodedArguments): mixed
    {
        $decoded = base64_decode($encodedArguments);
        $json = rawurldecode($decoded);
        return json_decode($json, true) ?? [];
    }

    # ----------[ Component ]----------

    private function makeComponent()
    {
        $class = app(OverlayRegistrar::class)
            ->resolveComponentClass($this->typename);

        if (is_subclass_of($class, 'Spatie\\LaravelData\\Data')) {
            return $class::from($this->arguments);
        }

        return app($class, $this->arguments);
    }

}