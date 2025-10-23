<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Demo', [
        'test' => Inertia::defer(fn() => 'This is a deferred prop!'),
    ]);
});

Route::post('/overlay-action');

Route::get('/redirect', function () {
    return redirect('/');
});

Route::post('/submit', function () {
    // Simulate form processing...
    sleep(1);
});

Route::post('/submit-error', function (Request $request) {
    $request->validate([
        'a_random_field' => 'required|min:5',
    ]);
});
