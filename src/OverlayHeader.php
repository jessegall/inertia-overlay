<?php

namespace JesseGall\InertiaOverlay;

class OverlayHeader
{
    public const string OVERLAY = 'X-Inertia-Overlay';
    public const string OVERLAY_INDEX = 'X-Inertia-Overlay-Index';

    public const string OVERLAY_ID = 'X-Inertia-Overlay-Id';
    public const string OVERLAY_OPENING_ID = 'X-Inertia-Overlay-Opening-Id';
    public const string OVERLAY_CLOSING_ID = 'X-Inertia-Overlay-Closing-Id';

    public const string OVERLAY_STACK = 'X-Inertia-Overlay-Stack';
    public const string OVERLAY_PREVIOUS_URL = 'X-Inertia-Overlay-Previous-Url';
    public const string OVERLAY_PAGE_COMPONENT = 'X-Inertia-Overlay-Page-Component';
}