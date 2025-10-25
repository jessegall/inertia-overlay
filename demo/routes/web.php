<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Demo', [
        'test' => '123'
    ]);
});

Route::get('/demo-other-page', function () {
    return Inertia::render('DemoOtherPage');
});

Route::get('/overlay', function () {
    return Inertia::overlay('DemoDrawer', [
        'someInitialData' => 'This is some initial data passed when opening the overlay.',
        'array_data' => ['one', 'two', 'three'],
    ]);
});

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
