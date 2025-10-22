<?php

namespace JesseGall\InertiaOverlay;

class OverlayContext
{


    /**
     * @param string $overlayId
     * @param string $typename
     * @param class-string<Overlay> $class
     * @param array $args
     */
    public function __construct(
        public string $overlayId,
        public string $typename,
        public string $class,
        public array $args,
    ) {}

    # ----------[ Headers ]----------

    public function isOpening(): bool
    {
        return $this->compare(OverlayHeader::OVERLAY_STATE, 'opening');
    }

    public function isClosing(): bool
    {
        return $this->compare(OverlayHeader::OVERLAY_STATE, 'closing');
    }

    public function isOpen(): bool
    {
        return $this->compare(OverlayHeader::OVERLAY_STATE, 'open');
    }

    public function isRedirected(): bool
    {
        return $this->isOverlayIdMatching()
            && $this->resolve(OverlayHeader::OVERLAY_REDIRECTED_ID) === $this->overlayId;
    }

    public function getIndex(): int
    {
        return (int)$this->resolve(OverlayHeader::OVERLAY_INDEX);
    }

    public function getRootUrl(): string|null
    {
        return $this->resolve(OverlayHeader::OVERLAY_ROOT_URL);
    }

    public function getPreviousId(): string|null
    {
        return $this->resolve(OverlayHeader::OVERLAY_PREVIOUS_ID);
    }

    public function getPageComponent(): string
    {
        return request()->header('X-Inertia-Partial-Component');
    }

    # ----------[ Arguments ]----------

    public function getArgument(string $key): mixed
    {
        return data_get($this->args, $key);
    }

    public function hasArgument(string $key): bool
    {
        return array_key_exists($key, $this->args);
    }

    public function setArgument(string $key, mixed $value): void
    {
        data_set($this->args, $key, $value);
    }

    # ----------[ Middleware ]----------

    /** @return OverlayMiddleware[] */
    public function getMiddleware(): array
    {
        if (is_a($this->class, SupportsMiddleware::class, true)) {
            return $this->class::middleware();
        }

        return [];
    }

    # ----------[ Internal ]----------

    private function isOverlayIdMatching(): bool
    {
        return $this->resolve(OverlayHeader::OVERLAY_ID) === $this->overlayId;
    }

    private function resolve(string $target): mixed
    {
        return session()->get($target) ?? request()->header($target);
    }

    private function compare(string $target, mixed $value): bool
    {
        return $this->resolve($target) === $value;
    }

}