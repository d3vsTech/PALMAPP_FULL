<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Autorización para Laravel Pulse dashboard (/pulse)
        Gate::define('viewPulse', function (User $user) {
            return $user->is_super_admin;
        });
    }
}
