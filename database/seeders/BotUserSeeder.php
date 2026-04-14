<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BotUserSeeder extends Seeder
{
    public function run(): void
    {
        $email    = 'bot@d3vs.tech';
        $password = env('BOT_USER_PASSWORD', 'bot-secret-change-me');

        $bot = User::updateOrCreate(
            ['email' => $email],
            [
                'name'              => 'Bot Integraciones',
                'password'          => Hash::make($password),
                'is_super_admin'    => true,
                'status'            => true,
                'email_verified_at' => now(),
            ],
        );

        $this->command->info('');
        $this->command->info('══════════════════════════════════════════');
        $this->command->info(' BOT user provisionado (super_admin)');
        $this->command->info('══════════════════════════════════════════');
        $this->command->info(" ID:       {$bot->id}");
        $this->command->info(" Email:    {$email}");
        $this->command->info(" Password: {$password}  (cambiar BOT_USER_PASSWORD en .env)");
        $this->command->info(" Acceso:   TODOS los tenants (presentes y futuros)");
        $this->command->info('══════════════════════════════════════════');
    }
}
