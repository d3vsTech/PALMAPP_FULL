<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\TenantConfig;
use App\Models\TenantUser;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ═══ 0. ROLES Y PERMISOS (Spatie) ═══
        $this->call(RolesAndPermissionsSeeder::class);

        // ═══ 0.1 DEPARTAMENTOS Y MUNICIPIOS ═══
        $this->call(DepartamentoMunicipioSeeder::class);

        // ═══ 0.2 BOT USER (super admin para integraciones) ═══
        $this->call(BotUserSeeder::class);

        // ═══ 1. SUPER ADMIN ═══
        $superAdmin = User::create([
            'name' => 'Super Admin D3VS',
            'email' => 'devs@d3vs.tech',
            'password' => Hash::make('password123'),
            'is_super_admin' => true,
            'status' => true,
            'email_verified_at' => now(),
        ]);

        // ═══ 2. TENANT DEMO ═══
        $tenantDemo = Tenant::create([
            'nombre' => 'Finca La Esperanza',
            'nit' => '900123456-1',
            'tipo_persona' => 'JURIDICA',
            'razon_social' => 'Agrícola La Esperanza S.A.S',
            'correo_contacto' => 'info@laesperanza.com',
            'telefono' => '3001234567',
            'direccion' => 'Vereda El Porvenir, Km 5',
            'departamento' => 'Meta',
            'municipio' => 'Acacías',
            'estado' => 'ACTIVO',
            'fecha_activacion' => now(),
            'plan' => 'BASICO',
            'max_empleados' => 100,
            'max_usuarios' => 10,
        ]);

        TenantConfig::create([
            'tenant_id' => $tenantDemo->id,
            'modulo_dashboard' => true,
            'modulo_plantacion' => true,
            'modulo_colaboradores' => true,
            'modulo_nomina' => true,
            'modulo_operaciones' => true,
            'modulo_viajes' => true,
            'modulo_usuarios' => true,
            'modulo_configuracion' => true,
            'tipo_pago_nomina' => 'QUINCENAL',
            'moneda' => 'COP',
            'zona_horaria' => 'America/Bogota',
            'pais' => 'CO',
            'salario_minimo_vigente' => 1423500.00,
            'auxilio_transporte' => 200000.00,
            'sync_habilitado' => true,
        ]);

        // ═══ 3. ADMIN DE FINCA ═══
        $adminFinca = User::create([
            'name' => 'Juan Pérez',
            'email' => 'juan@laesperanza.com',
            'password' => Hash::make('password'),
            'is_super_admin' => false,
            'status' => true,
        ]);

        TenantUser::create([
            'tenant_id' => $tenantDemo->id,
            'user_id' => $adminFinca->id,
            'rol' => 'ADMIN',
            'estado' => true,
        ]);

        // Asignar rol Spatie en el contexto del tenant
        setPermissionsTeamId($tenantDemo->id);
        $adminFinca->assignRole('ADMIN');

        // ═══ 4. USUARIO CON PERMISOS DE OPERACIONES (antes Líder de Campo) ═══
        $operador = User::create([
            'name' => 'Carlos Rodríguez',
            'email' => 'carlos@laesperanza.com',
            'password' => Hash::make('password'),
            'is_super_admin' => false,
            'status' => true,
        ]);

        TenantUser::create([
            'tenant_id' => $tenantDemo->id,
            'user_id' => $operador->id,
            'rol' => 'USUARIO',
            'estado' => true,
        ]);

        // Asignar permisos directos (operaciones, viajes, colaboradores lectura)
        $operador->givePermissionTo([
            'dashboard.ver',
            'operaciones.ver', 'operaciones.crear', 'operaciones.editar', 'operaciones.eliminar',
            'cosecha.ver', 'cosecha.crear', 'cosecha.editar', 'cosecha.eliminar',
            'jornales.ver', 'jornales.crear', 'jornales.editar', 'jornales.eliminar',
            'auxiliares.ver', 'auxiliares.crear', 'auxiliares.editar', 'auxiliares.eliminar',
            'viajes.ver', 'viajes.crear', 'viajes.editar', 'viajes.eliminar',
            'colaboradores.ver',
            'contratos.ver',
        ]);

        // ═══ 5. USUARIO SOLO LECTURA (antes Propietario) ═══
        $lector = User::create([
            'name' => 'María García',
            'email' => 'maria@laesperanza.com',
            'password' => Hash::make('password'),
            'is_super_admin' => false,
            'status' => true,
        ]);

        TenantUser::create([
            'tenant_id' => $tenantDemo->id,
            'user_id' => $lector->id,
            'rol' => 'USUARIO',
            'estado' => true,
        ]);

        // Asignar permisos directos (solo lectura)
        $lector->givePermissionTo([
            'dashboard.ver',
            'lotes.ver', 'sublotes.ver', 'palmas.ver',
            'colaboradores.ver', 'contratos.ver',
            'operaciones.ver', 'cosecha.ver', 'jornales.ver', 'auxiliares.ver',
            'viajes.ver',
            'nomina.ver',
        ]);

        $this->command->info('');
        $this->command->info('══════════════════════════════════════════');
        $this->command->info(' AGRO CAMPO — Seeders ejecutados');
        $this->command->info('══════════════════════════════════════════');
        $this->command->info(" Super Admin:    devs@d3vs.tech / password123");
        $this->command->info(" Admin Finca:    juan@laesperanza.com / password");
        $this->command->info(" Usuario (ops):  carlos@laesperanza.com / password");
        $this->command->info(" Usuario (lect): maria@laesperanza.com / password");
        $this->command->info(" Tenant Demo:    {$tenantDemo->nombre} (ID: {$tenantDemo->id})");
        $this->command->info('══════════════════════════════════════════');
    }
}
