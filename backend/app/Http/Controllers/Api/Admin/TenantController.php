<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTenantRequest;
use App\Http\Requests\Admin\UpdateTenantRequest;
use App\Models\Arl;
use App\Models\EntidadBancaria;
use App\Models\Eps;
use App\Models\FondoCesantias;
use App\Models\FondoPension;
use App\Models\Labor;
use App\Models\Semilla;
use App\Models\Tenant;
use App\Models\TipoHoraExtra;
use App\Models\TenantConfig;
use App\Models\TenantUser;
use App\Models\User;
use App\Services\AuditoriaService;
use Database\Seeders\InsumoSeeder;
use Database\Seeders\MotivoAusenciaSeeder;
use Database\Seeders\NominaConceptoSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TenantController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * GET /api/admin/tenants
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenants = Tenant::query()
                ->with('config')
                ->when($request->estado, fn($q, $e) => $q->where('estado', $e))
                ->when($request->plan, fn($q, $p) => $q->where('plan', $p))
                ->when($request->search, fn($q, $s) => $q->where(function ($q) use ($s) {
                    $q->where('nombre', 'ilike', "%{$s}%")
                      ->orWhere('nit', 'ilike', "%{$s}%")
                      ->orWhere('razon_social', 'ilike', "%{$s}%");
                }))
                ->withCount(['tenantUsers as total_usuarios', 'empleados as total_empleados'])
                ->orderBy($request->sort_by ?? 'nombre', $request->sort_dir ?? 'asc')
                ->paginate($request->per_page ?? 15);

            return response()->json($tenants);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al listar los tenants',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/admin/tenants
     */
    public function store(StoreTenantRequest $request): JsonResponse
    {
        try {
            $tenant = DB::transaction(function () use ($request) {
                $tenant = Tenant::create([
                    ...$request->tenantData(),
                    'estado' => 'ACTIVO',
                ]);

                TenantConfig::create([
                    'tenant_id' => $tenant->id,
                    ...$request->configDefaults(),
                ]);

                $this->seedLaboresFijas($tenant);
                $this->seedParametricasColaborador($tenant);
                $this->seedTiposHoraExtra($tenant);
                $this->seedSemillas($tenant);
                $this->seedInsumos($tenant);
                $this->seedNominaConceptos($tenant);
                $this->seedMotivosAusencia($tenant);

                return $tenant;
            });

            $tenant->load('config');

            $this->auditoria->registrarCreacion($request, 'TENANTS', $tenant, "Se creó la finca '{$tenant->nombre}'");

            return response()->json([
                'message' => "Finca '{$tenant->nombre}' creada exitosamente",
                'data' => $tenant,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al crear la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/tenants/{tenant}
     */
    public function show(Tenant $tenant): JsonResponse
    {
        try {
            $tenant->load(['config', 'tenantUsers.user']);
            $tenant->loadCount(['tenantUsers as total_usuarios', 'empleados as total_empleados']);

            return response()->json([
                'data' => $tenant,
                'modulos' => $tenant->modulosActivos(),
                'config_nomina' => $tenant->configNomina(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al obtener el detalle del tenant',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/admin/tenants/{tenant}
     */
    public function update(UpdateTenantRequest $request, Tenant $tenant): JsonResponse
    {
        try {
            $datosAnteriores = $tenant->toArray();

            $tenantData = $request->tenantData();
            if (!empty($tenantData)) {
                $tenant->update($tenantData);
            }

            $this->auditoria->registrarEdicion($request, 'TENANTS', $tenant, $datosAnteriores, "Se editó la finca '{$tenant->nombre}'");

            return response()->json([
                'message' => 'Finca actualizada correctamente',
                'data' => $tenant->fresh(['config']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/tenants/{tenant}
     */
    public function destroy(Request $request, Tenant $tenant): JsonResponse
    {
        try {
            if ($tenant->estado === 'ACTIVO') {
                return response()->json([
                    'message' => 'No se puede eliminar un tenant activo. Suspéndalo primero.',
                    'code' => 'TENANT_ACTIVE',
                ], 422);
            }

            $this->auditoria->registrarEliminacion($request, 'TENANTS', $tenant, "Se eliminó la finca '{$tenant->nombre}'");

            $tenant->delete();

            return response()->json([
                'message' => "Finca '{$tenant->nombre}' eliminada correctamente",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al eliminar la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/admin/tenants/{tenant}/toggle
     */
    public function toggle(Request $request, Tenant $tenant): JsonResponse
    {
        try {
            $datosAnteriores = $tenant->toArray();

            match ($tenant->estado) {
                'ACTIVO' => $tenant->suspender(),
                'SUSPENDIDO', 'INACTIVO' => $tenant->activar(),
            };

            $this->auditoria->registrarEdicion($request, 'TENANTS', $tenant, $datosAnteriores, "Finca '{$tenant->nombre}' cambió a {$tenant->estado}");

            return response()->json([
                'message' => "Finca '{$tenant->nombre}' ahora está {$tenant->estado}",
                'data' => $tenant,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al cambiar el estado de la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ─── Gestión de usuarios del tenant ─────────────────

    /**
     * GET /api/admin/tenants/{tenant}/users
     */
    public function listUsers(Tenant $tenant): JsonResponse
    {
        try {
            $usuarios = TenantUser::where('tenant_id', $tenant->id)
                ->with('user:id,name,email,status')
                ->get()
                ->map(fn($tu) => [
                    'id' => $tu->user->id,
                    'name' => $tu->user->name,
                    'email' => $tu->user->email,
                    'status' => $tu->user->status,
                    'is_admin' => $tu->rol === 'ADMIN',
                    'estado' => $tu->estado,
                    'asignado_at' => $tu->created_at,
                ]);

            return response()->json(['data' => $usuarios]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al listar los usuarios del tenant',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/admin/tenants/{tenant}/users
     */
    public function addUser(Request $request, Tenant $tenant): JsonResponse
    {
        try {
            $request->validate([
                'user_id'  => 'required_without:email|exists:users,id',
                'email'    => 'required_without:user_id|email',
                'name'     => 'required_with:email|string|max:255',
                'password' => 'required_with:email|string|min:8',
                'rol'      => 'sometimes|in:ADMIN,USUARIO',
            ]);

            // Validar límite de usuarios del plan
            if ($tenant->max_usuarios) {
                $currentCount = TenantUser::where('tenant_id', $tenant->id)->where('estado', true)->count();
                if ($currentCount >= $tenant->max_usuarios) {
                    return response()->json([
                        'message' => "Este tenant ha alcanzado el límite de {$tenant->max_usuarios} usuarios",
                        'code' => 'MAX_USERS_REACHED',
                    ], 422);
                }
            }

            // Si envían email (crear usuario nuevo)
            if ($request->email && !$request->user_id) {
                $existingUser = User::where('email', $request->email)->first();
                if ($existingUser) {
                    $userId = $existingUser->id;
                } else {
                    $newUser = User::create([
                        'name' => $request->name,
                        'email' => $request->email,
                        'password' => bcrypt($request->password),
                        'status' => true,
                    ]);
                    $userId = $newUser->id;
                }
            } else {
                $userId = $request->user_id;
            }

            // Verificar si ya está asignado
            $exists = TenantUser::where('tenant_id', $tenant->id)
                ->where('user_id', $userId)
                ->first();

            $rol = $request->input('rol', 'USUARIO');

            if ($exists) {
                if (!$exists->estado) {
                    $exists->update(['estado' => true, 'rol' => $rol]);

                    if ($rol === 'ADMIN') {
                        $user = User::find($userId);
                        setPermissionsTeamId($tenant->id);
                        $user->syncRoles(['ADMIN']);
                    }

                    $this->auditoria->registrar($request, 'CREAR', 'TENANT_USERS', "Usuario #{$userId} reactivado en finca '{$tenant->nombre}' con rol {$rol}", null, ['tenant_id' => $tenant->id, 'user_id' => $userId, 'rol' => $rol]);

                    return response()->json([
                        'message' => 'Usuario reactivado en el tenant',
                    ]);
                }
                return response()->json([
                    'message' => 'El usuario ya está asignado a esta finca',
                    'code' => 'USER_ALREADY_ASSIGNED',
                ], 409);
            }

            TenantUser::create([
                'tenant_id' => $tenant->id,
                'user_id' => $userId,
                'rol' => $rol,
                'estado' => true,
            ]);

            if ($rol === 'ADMIN') {
                $user = User::find($userId);
                setPermissionsTeamId($tenant->id);
                $user->assignRole('ADMIN');
            }

            $this->auditoria->registrar($request, 'CREAR', 'TENANT_USERS', "Usuario #{$userId} asignado a finca '{$tenant->nombre}' con rol {$rol}", null, ['tenant_id' => $tenant->id, 'user_id' => $userId, 'rol' => $rol]);

            return response()->json([
                'message' => 'Usuario asignado a la finca correctamente',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al asignar el usuario a la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/admin/tenants/{tenant}/users/{user}
     */
    public function updateUser(Request $request, Tenant $tenant, User $user): JsonResponse
    {
        try {
            $request->validate([
                'name'   => 'sometimes|string|max:255',
                'email'  => "sometimes|email|max:255|unique:users,email,{$user->id}",
                'rol'    => 'sometimes|in:ADMIN,USUARIO',
                'estado' => 'sometimes|boolean',
            ], [
                'name.max'       => 'El nombre no puede exceder 255 caracteres',
                'email.email'    => 'El correo electrónico debe ser válido',
                'email.unique'   => 'Ya existe un usuario con este correo electrónico',
                'rol.in'         => 'El rol debe ser ADMIN o USUARIO',
                'estado.boolean' => 'El estado debe ser verdadero o falso',
            ]);

            $pivot = TenantUser::where('tenant_id', $tenant->id)
                ->where('user_id', $user->id)
                ->first();

            if (!$pivot) {
                return response()->json([
                    'message' => 'El usuario no está asignado a esta finca',
                ], 404);
            }

            // Actualizar datos del usuario (name, email)
            $userData = $request->only(['name', 'email']);
            if (!empty($userData)) {
                $user->update($userData);
            }

            // Actualizar datos del pivot (rol, estado)
            $pivotData = $request->only(['rol', 'estado']);
            if (!empty($pivotData)) {
                $pivot->update($pivotData);
            }

            if ($request->has('rol')) {
                setPermissionsTeamId($tenant->id);
                if ($request->rol === 'ADMIN') {
                    $user->syncRoles(['ADMIN']);
                } else {
                    // Revocar rol ADMIN si pasa a USUARIO
                    $user->syncRoles([]);
                }
            }

            $this->auditoria->registrar($request, 'EDITAR', 'TENANT_USERS', "Usuario '{$user->name}' actualizado en finca '{$tenant->nombre}'", null, ['user_id' => $user->id, 'cambios' => array_merge($userData, $pivotData)]);

            return response()->json([
                'message' => 'Usuario actualizado en la finca',
                'data' => [
                    'user_id' => $user->id,
                    'name'    => $user->name,
                    'email'   => $user->email,
                    'rol'     => $pivot->fresh()->rol,
                    'estado'  => $pivot->fresh()->estado,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al actualizar el usuario en la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/tenants/{tenant}/users/{user}
     */
    public function removeUser(Request $request, Tenant $tenant, User $user): JsonResponse
    {
        try {
            $deleted = TenantUser::where('tenant_id', $tenant->id)
                ->where('user_id', $user->id)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'message' => 'El usuario no está asignado a esta finca',
                ], 404);
            }

            $this->auditoria->registrar($request, 'ELIMINAR', 'TENANT_USERS', "Usuario '{$user->name}' removido de finca '{$tenant->nombre}'", ['tenant_id' => $tenant->id, 'user_id' => $user->id]);

            return response()->json([
                'message' => 'Usuario removido de la finca',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error al remover el usuario de la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    private function seedTiposHoraExtra(Tenant $tenant): void
    {
        $tipos = [
            [
                'codigo'             => TipoHoraExtra::CODIGO_HED,
                'nombre'             => 'Hora Extra Diurna (6am-9pm)',
                'porcentaje_recargo' => 25.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_DIURNO,
                'aplica_festivo'     => false,
                'es_extra'           => true,
                'paga_hora_completa' => true,
                'descripcion'        => 'Lunes a sábado 6:00 AM - 9:00 PM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_HEN,
                'nombre'             => 'Hora Extra Nocturna (9pm-6am)',
                'porcentaje_recargo' => 75.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_NOCTURNO,
                'aplica_festivo'     => false,
                'es_extra'           => true,
                'paga_hora_completa' => true,
                'descripcion'        => 'Lunes a sábado 9:00 PM - 6:00 AM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_RN,
                'nombre'             => 'Recargo Nocturno',
                'porcentaje_recargo' => 35.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_NOCTURNO,
                'aplica_festivo'     => false,
                'es_extra'           => false,
                'paga_hora_completa' => false,
                'descripcion'        => 'Lunes a sábado 9:00 PM - 6:00 AM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_HRD,
                'nombre'             => 'Hora Ordinaria Dominical/Festivo',
                'porcentaje_recargo' => 90.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_DIURNO,
                'aplica_festivo'     => true,
                'es_extra'           => false,
                'paga_hora_completa' => true,
                'descripcion'        => 'Domingos y festivos 6:00 AM - 9:00 PM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_HEDF,
                'nombre'             => 'Hora Extra Diurna Dominical/Festivo',
                'porcentaje_recargo' => 115.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_DIURNO,
                'aplica_festivo'     => true,
                'es_extra'           => true,
                'paga_hora_completa' => true,
                'descripcion'        => 'Domingos y festivos 6:00 AM - 9:00 PM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_HENF,
                'nombre'             => 'Hora Extra Nocturna Dominical/Festivo',
                'porcentaje_recargo' => 165.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_NOCTURNO,
                'aplica_festivo'     => true,
                'es_extra'           => true,
                'paga_hora_completa' => true,
                'descripcion'        => 'Domingos y festivos 9:00 PM - 6:00 AM',
            ],
            [
                'codigo'             => TipoHoraExtra::CODIGO_RND,
                'nombre'             => 'Recargo Nocturno Dominical/Festivo',
                'porcentaje_recargo' => 125.00,
                'franja_horaria'     => TipoHoraExtra::FRANJA_NOCTURNO,
                'aplica_festivo'     => true,
                'es_extra'           => false,
                'paga_hora_completa' => false,
                'descripcion'        => 'Domingos y festivos 9:00 PM - 6:00 AM',
            ],
        ];

        foreach ($tipos as $tipo) {
            TipoHoraExtra::updateOrCreate(
                ['tenant_id' => $tenant->id, 'codigo' => $tipo['codigo']],
                array_merge($tipo, ['tenant_id' => $tenant->id, 'estado' => true])
            );
        }
    }

    /**
     * Provisiona las 5 labores fijas del sistema (es_sistema=true) para un
     * tenant recién creado. tipo_pago default convencional; precio_palma=null
     * (el admin lo configura desde Configuración → Labores).
     */
    private function seedLaboresFijas(Tenant $tenant): void
    {
        $defaults = [
            Labor::TIPO_COSECHA       => Labor::TIPO_PAGO_POR_PALMA,
            Labor::TIPO_PLATEO        => Labor::TIPO_PAGO_POR_PALMA,
            Labor::TIPO_PODA          => Labor::TIPO_PAGO_POR_PALMA,
            Labor::TIPO_FERTILIZACION => Labor::TIPO_PAGO_POR_PALMA,
            Labor::TIPO_SANIDAD       => Labor::TIPO_PAGO_JORNAL_FIJO,
        ];

        foreach (Labor::TIPOS_FIJOS as $tipo) {
            Labor::create([
                'tenant_id'    => $tenant->id,
                'categoria'    => Labor::CATEGORIA_PALMA,
                'tipo'         => $tipo,
                'nombre'       => Labor::NOMBRES_FIJOS[$tipo],
                'tipo_pago'    => $defaults[$tipo],
                'precio_palma' => null,
                'es_sistema'   => true,
                'estado'       => true,
            ]);
        }
    }

    private function seedSemillas(Tenant $tenant): void
    {
        $semillas = [
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x La Mé'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Yangambi'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x AVROS'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Nigeria (NIFOR)'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Ghana (Calabar)'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'Deli x Ekona'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'DxP Unipalma'],
            ['tipo' => 'HIBRIDO_TENERA', 'nombre' => 'DxP Indupalma'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG AGROSAVIA El Mira (F1)'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Pacífico RC1'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Tumaco RC1'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Amazon'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Compacta x Ghana'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Semillas Unipalma'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Indupalma'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Taisha'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG PDR-Taisha'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Coarí x La Mé'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Colombia (Coarí x La Mé)'],
            ['tipo' => 'HIBRIDO_OXG', 'nombre' => 'OxG Guineensis RI'],
        ];

        foreach ($semillas as $data) {
            Semilla::firstOrCreate(
                ['tenant_id' => $tenant->id, 'nombre' => $data['nombre']],
                ['tipo' => $data['tipo'], 'estado' => true]
            );
        }
    }

    /**
     * Provisiona el catálogo completo de conceptos de nómina para un tenant recién
     * creado: legales activos (SALUD, PENSION, ARL, FSP_*) + plantilla con conceptos
     * activos por defecto (DCTO_ADELANTO, BONIFICACION, etc.).
     * Los conceptos inactivos de la plantilla (RETEFUENTE, LIBRANZA, etc.) quedan
     * disponibles pero desactivados; el admin los activa desde Configuración → Nómina.
     */
    private function seedNominaConceptos(Tenant $tenant): void
    {
        (new NominaConceptoSeeder())->sembrarParaTenant($tenant, soloActivos: false);
    }

    private function seedMotivosAusencia(Tenant $tenant): void
    {
        (new MotivoAusenciaSeeder())->sembrarParaTenant($tenant);
    }

    /**
     * Provisiona el catálogo base de fertilizantes (~59 productos comerciales
     * usados en palma de aceite) para un tenant recién creado. El admin puede
     * desactivar o agregar insumos desde Configuración → Insumos.
     */
    private function seedInsumos(Tenant $tenant): void
    {
        (new InsumoSeeder())->sembrarParaTenant($tenant);
    }

    /**
     * Provisiona los catálogos paramétricos del colaborador (EPS, fondos de
     * pensión, fondos de cesantías, ARL y entidades bancarias) para un tenant
     * recién creado.
     */
    private function seedParametricasColaborador(Tenant $tenant): void
    {
        $catalogos = [
            [Eps::class,             Eps::INICIALES],
            [FondoPension::class,    FondoPension::INICIALES],
            [FondoCesantias::class,  FondoCesantias::INICIALES],
            [Arl::class,             Arl::INICIALES],
            [EntidadBancaria::class, EntidadBancaria::INICIALES],
        ];

        foreach ($catalogos as [$modelClass, $nombres]) {
            foreach ($nombres as $nombre) {
                $modelClass::create([
                    'tenant_id' => $tenant->id,
                    'nombre'    => $nombre,
                    'estado'    => true,
                ]);
            }
        }
    }
}
