<?php

use Illuminate\Support\Facades\Route;
use KBTech\FileManager\Http\FileManagerController as FM;

Route::prefix(config('file-manager.prefix'))->name('file-manager.')->group(function () {
    Route::get('media/{id}', [FM::class, 'media'])->whereNumber('id')->name('media');
    Route::middleware(config('file-manager.middleware'))->group(function () {
        Route::get('/', [FM::class, 'page'])->name('index');
        Route::get('api/nodes', [FM::class, 'index'])->name('nodes');
        Route::get('api/tree', [FM::class, 'tree'])->name('tree');
        Route::post('api/upload', [FM::class, 'upload'])->middleware('throttle:60,1')->name('upload');
        Route::post('api/folders', [FM::class, 'folder'])->name('folder');
        Route::patch('api/nodes/{id}', [FM::class, 'update'])->whereNumber('id')->name('update');
        Route::delete('api/nodes/{id}', [FM::class, 'trash'])->whereNumber('id')->name('trash');
        Route::post('api/nodes/{id}/restore', [FM::class, 'restore'])->whereNumber('id')->name('restore');
        Route::delete('api/nodes/{id}/purge', [FM::class, 'purge'])->whereNumber('id')->name('purge');
        Route::post('api/nodes/{id}/transform', [FM::class, 'transform'])->whereNumber('id')->name('transform');
        Route::get('api/nodes/{id}/grants', [FM::class, 'grants'])->whereNumber('id')->name('grants');
        Route::put('api/nodes/{id}/grants', [FM::class, 'saveGrant'])->whereNumber('id')->name('save-grant');
        Route::delete('api/nodes/{id}/grants/{userId}', [FM::class, 'revokeGrant'])->whereNumber('id')->name('revoke-grant');
        Route::get('content/{id}', [FM::class, 'content'])->whereNumber('id')->name('content');
    });
});
