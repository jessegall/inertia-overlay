<?php

namespace JesseGall\InertiaOverlay;

use Illuminate\Http\Request;
use JesseGall\InertiaOverlay\Http\OverlayResponse;

readonly class Overlay
{

    public string $component;
    public array $arguments;

    public function __construct(
        private Request $request,
    )
    {
        [$this->component, $this->arguments] = $this->parseOverlayId($this->getId());
    }

    public function render(): OverlayResponse
    {
        return new OverlayResponse($this);
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

}