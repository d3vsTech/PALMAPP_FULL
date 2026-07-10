<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Agrega el permiso `nomina.pagar-tercero` (introducido en PR-4) a instalaciones
 * existentes y lo asigna a todos los roles ADMIN (guard `api`).
 *
 * Idempotente: puede ejecutarse múltiples veces sin duplicar filas.
 *
 * Uso:
 *   php artisan db:seed --class=AddNominaPagarTerceroPermissionSeeder
 */
class AddNominaPagarTerceroPermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permisoNombre = 'nomina.pagar-tercero';
        $guard         = 'api';

        // 1) Asegurar que exista el permiso (idempotente).
        $permiso = Permission::firstOrCreate([
            'name'       => $permisoNombre,
            'guard_name' => $guard,
        ]);

        // 2) Asignar el permiso a todos los roles ADMIN.
        //    Con `teams: true` en Spatie, puede existir un ADMIN global
        //    (team_foreign_key=NULL) y/o uno por tenant — cubrimos ambos.
        $rolesAdmin = Role::where('name', 'ADMIN')
            ->where('guard_name', $guard)
            ->get();

        $asignados = 0;
        foreach ($rolesAdmin as $rol) {
            if (! $rol->hasPermissionTo($permiso)) {
                $rol->givePermissionTo($permiso);
                $asignados++;
            }
        }

        // 3) Reset cache de Spatie para que los usuarios ADMIN vean el permiso
        //    en la próxima request sin tener que reiniciar el proceso.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->command->info('');
        $this->command->info('══════════════════════════════════════════');
        $this->command->info(" Permiso `{$permisoNombre}` aplicado");
        $this->command->info('══════════════════════════════════════════');
        $this->command->info(" Permiso ID:              {$permiso->id}");
        $this->command->info(" Roles ADMIN encontrados: {$rolesAdmin->count()}");
        $this->command->info(" Roles actualizados:      {$asignados}");
        $this->command->info(" (Los ya vinculados se omiten — idempotente.)");
        $this->command->info('══════════════════════════════════════════');
    }
}
