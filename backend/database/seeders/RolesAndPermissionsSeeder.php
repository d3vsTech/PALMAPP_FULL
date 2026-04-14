<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Mapa de dependencias de permisos.
     *
     * Cuando un usuario recibe un permiso padre,
     * automáticamente debe recibir los permisos hijos.
     * Esto se aplica al asignar permisos en UserPermissionController.
     *
     * Nota: Plantación (lotes, sublotes, líneas, palmas) NO tiene dependencias.
     * Cada módulo se asigna de forma independiente.
     */
    public const DEPENDENCIAS = [
        // Colaboradores → Contratos
        'colaboradores.ver'      => ['contratos.ver'],
        'colaboradores.crear'    => ['contratos.crear'],
        'colaboradores.editar'   => ['contratos.editar'],
        'colaboradores.eliminar' => ['contratos.eliminar'],
    ];

    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // ═══════════════════════════════════════════════
        // PERMISOS — agrupados por módulo
        // ═══════════════════════════════════════════════
        $permisos = [
            // ── Dashboard ──
            'dashboard.ver',

            // ── Plantación (jerárquico: lotes > sublotes > líneas > palmas) ──
            'lotes.ver',
            'lotes.crear',
            'lotes.editar',
            'lotes.eliminar',

            'sublotes.ver',
            'sublotes.crear',
            'sublotes.editar',
            'sublotes.eliminar',

            'lineas.ver',
            'lineas.crear',
            'lineas.editar',
            'lineas.eliminar',

            'palmas.ver',
            'palmas.crear',
            'palmas.editar',
            'palmas.eliminar',

            // ── Colaboradores (incluye contratos) ──
            'colaboradores.ver',
            'colaboradores.crear',
            'colaboradores.editar',
            'colaboradores.eliminar',

            'contratos.ver',
            'contratos.crear',
            'contratos.editar',
            'contratos.eliminar',

            // ── Operaciones: Planilla ──
            'operaciones.ver',
            'operaciones.crear',
            'operaciones.editar',
            'operaciones.eliminar',

            'cosecha.ver',
            'cosecha.crear',
            'cosecha.editar',
            'cosecha.eliminar',

            'jornales.ver',
            'jornales.crear',
            'jornales.editar',
            'jornales.eliminar',

            'auxiliares.ver',
            'auxiliares.crear',
            'auxiliares.editar',
            'auxiliares.eliminar',

            // ── Viajes ──
            'viajes.ver',
            'viajes.crear',
            'viajes.editar',
            'viajes.eliminar',

            // ── Nómina ──
            'nomina.ver',
            'nomina.crear',
            'nomina.editar',
            'nomina.calcular',
            'nomina.cerrar',

            // ── Gestión de Usuarios ──
            'usuarios.ver',
            'usuarios.crear',
            'usuarios.editar',
            'usuarios.eliminar',
            'usuarios.ver_permisos',
            'usuarios.editar_permisos',
            'usuarios.desactivar',

            // ── Configuración ──
            'configuracion.editar',
        ];

        foreach ($permisos as $permiso) {
            Permission::create(['name' => $permiso, 'guard_name' => 'api']);
        }

        // ═══════════════════════════════════════════════
        // ROL — Solo ADMIN (acceso total dentro del tenant)
        // Los demás usuarios reciben permisos directos.
        // ═══════════════════════════════════════════════

        Role::create(['name' => 'ADMIN', 'guard_name' => 'api'])
            ->givePermissionTo($permisos);

        $this->command->info('');
        $this->command->info('══════════════════════════════════════════');
        $this->command->info(' Roles y permisos creados:');
        $this->command->info('  ADMIN → Acceso total');
        $this->command->info('  (Los demás usuarios reciben permisos directos)');
        $this->command->info('══════════════════════════════════════════');
    }
}
