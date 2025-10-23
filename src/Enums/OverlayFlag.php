<?php

namespace JesseGall\InertiaOverlay\Enums;

enum OverlayFlag: string
{

    case SKIP_HYDRATION_ON_REFOCUS = 'skip_hydration_on_refocus';
    case USE_SHARED_PROPS = 'use_shared_props';

}