<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Demo');
});

Route::post('/submit', function () {
    // Simulate form processing...
    sleep(2);
});
