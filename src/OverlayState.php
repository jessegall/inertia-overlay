<?php

namespace JesseGall\InertiaOverlay;

enum OverlayState: string
{
    
    case OPENING = 'opening';
    case OPEN = 'open';
    case CLOSING = 'closing';
    case CLOSED = 'closed';

}
