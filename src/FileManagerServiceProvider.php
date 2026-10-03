<?php

namespace KBTech\FileManager;

use Illuminate\Support\ServiceProvider;
use KBTech\FileManager\Services\Access;

class FileManagerServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/file-manager.php', 'file-manager');
        if (! config('filesystems.disks.file-manager')) {
            config(['filesystems.disks.file-manager' => [
                'driver' => 'local', 'root' => storage_path('app/file-manager'), 'throw' => true,
            ]]);
        }
        $this->app->scoped(Access::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'file-manager');
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');
        $this->publishes([__DIR__.'/../config/file-manager.php' => config_path('file-manager.php')], 'file-manager-config');
        $this->publishes([__DIR__.'/../resources/assets' => public_path('vendor/file-manager')], 'file-manager-assets');
        $this->publishes([__DIR__.'/../resources/views' => resource_path('views/vendor/file-manager')], 'file-manager-views');
    }
}
