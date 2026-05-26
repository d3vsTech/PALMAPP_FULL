<?php

namespace App\Http\Controllers\Api\Market;

use App\Http\Controllers\Controller;
use App\Http\Requests\Market\Configuracion\UpdateConfiguracionBancarioRequest;
use App\Http\Requests\Market\Configuracion\UpdateConfiguracionEnviosRequest;
use App\Http\Requests\Market\Configuracion\UpdateConfiguracionGeneralRequest;
use App\Http\Requests\Market\Configuracion\UpdateConfiguracionNotificacionesRequest;
use App\Models\Market\MarketProveedor;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MarketProveedorConfiguracionController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    public const NOTIFICACIONES_DEFAULTS = [
        'nuevos_pedidos'     => true,
        'cambios_estado'     => true,
        'mensajes_clientes'  => true,
        'reportes_diarios'   => false,
        'reportes_semanales' => false,
    ];

    /**
     * GET /api/v1/market/proveedor/configuracion
     *
     * Retorna las 4 secciones (General, Bancario, Envíos, Notificaciones) en una sola respuesta.
     * Lectura permitida para ADMIN y OPERADOR.
     */
    public function index(): JsonResponse
    {
        try {
            /** @var MarketProveedor $proveedor */
            $proveedor = app('current_proveedor');
            $proveedor->load(['banco:id,nombre,codigo', 'transportadora:id,nombre,codigo']);

            return response()->json([
                'data' => [
                    'general'        => $this->seccionGeneral($proveedor),
                    'bancario'       => $this->seccionBancario($proveedor),
                    'envios'         => $this->seccionEnvios($proveedor),
                    'notificaciones' => $this->seccionNotificaciones($proveedor),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Market: error al obtener configuración', [
                'proveedor_id' => app()->bound('current_proveedor_id') ? app('current_proveedor_id') : null,
                'error'        => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Error al obtener la configuración',
                'code'    => 'INTERNAL_ERROR',
            ], 500);
        }
    }

    /**
     * GET /api/v1/market/proveedor/configuracion/resumen
     *
     * Retorna lo que muestra el panel derecho de la UI: empresa, cuenta bancaria (enmascarada),
     * envíos, total de notificaciones activas y porcentaje de progreso de las 4 etapas.
     */
    public function resumen(): JsonResponse
    {
        try {
            /** @var MarketProveedor $proveedor */
            $proveedor = app('current_proveedor');
            $proveedor->load(['banco:id,nombre', 'transportadora:id,nombre']);

            $notificaciones = $proveedor->notificaciones_config ?? self::NOTIFICACIONES_DEFAULTS;
            $notificacionesActivas = collect($notificaciones)->filter(fn ($v) => $v === true)->count();

            $etapasCompletadas = $this->calcularEtapasCompletadas($proveedor);
            $etapasTotal       = 4;

            return response()->json([
                'data' => [
                    'empresa' => [
                        'nombre_empresa' => $proveedor->nombre_empresa,
                        'nit'            => $proveedor->nit,
                    ],
                    'cuenta_bancaria' => $proveedor->banco_id ? [
                        'banco'              => $proveedor->banco?->nombre,
                        'tipo_cuenta'        => $proveedor->tipo_cuenta,
                        'numero_cuenta_mask' => $this->enmascararCuenta($proveedor->numero_cuenta),
                    ] : null,
                    'envios' => $proveedor->transportadora_id ? [
                        'transportadora'           => $proveedor->transportadora?->nombre,
                        'tiempo_preparacion_horas' => $proveedor->tiempo_preparacion_horas,
                        'monto_envio_gratis'       => $proveedor->monto_envio_gratis,
                        'permitir_recoger_tienda'  => $proveedor->permitir_recoger_tienda,
                    ] : null,
                    'notificaciones_activas' => $notificacionesActivas,
                    'notificaciones_total'   => count(self::NOTIFICACIONES_DEFAULTS),
                    'progreso' => [
                        'etapas_completadas' => $etapasCompletadas,
                        'etapas_total'       => $etapasTotal,
                        'porcentaje'         => (int) round(($etapasCompletadas / $etapasTotal) * 100),
                    ],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Market: error al obtener resumen de configuración', [
                'proveedor_id' => app()->bound('current_proveedor_id') ? app('current_proveedor_id') : null,
                'error'        => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Error al obtener el resumen',
                'code'    => 'INTERNAL_ERROR',
            ], 500);
        }
    }

    /**
     * PUT /api/v1/market/proveedor/configuracion/general
     */
    public function updateGeneral(UpdateConfiguracionGeneralRequest $request): JsonResponse
    {
        try {
            /** @var MarketProveedor $proveedor */
            $proveedor = app('current_proveedor');

            $datosAnteriores = $proveedor->only([
                'nombre_empresa', 'nit', 'telefono', 'email',
                'direccion', 'ciudad', 'departamento', 'descripcion', 'logo_url',
            ]);

            $data = $request->configData();
            if (!empty($data)) {
                $proveedor->update($data);
            }

            $this->auditoria->registrarEdicion(
                request: $request,
                modulo: 'MARKET_PROVEEDOR_CONFIG_GENERAL',
                modelo: $proveedor,
                datosAnteriores: $datosAnteriores,
                descripcion: "Datos generales actualizados para '{$proveedor->nombre_empresa}'",
            );

            return response()->json([
                'message' => 'Datos generales actualizados correctamente',
                'data'    => $this->seccionGeneral($proveedor->fresh()),
            ]);
        } catch (\Throwable $e) {
            Log::error('Market: error al actualizar configuración general', [
                'proveedor_id' => app()->bound('current_proveedor_id') ? app('current_proveedor_id') : null,
                'error'        => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Error al actualizar los datos generales',
                'code'    => 'INTERNAL_ERROR',
            ], 500);
        }
    }

    /**
     * PUT /api/v1/market/proveedor/configuracion/bancario
     */
    public function updateBancario(UpdateConfiguracionBancarioRequest $request): JsonResponse
    {
        try {
            /** @var MarketProveedor $proveedor */
            $proveedor = app('current_proveedor');

            $datosAnteriores = $proveedor->only([
                'banco_id', 'tipo_cuenta', 'numero_cuenta', 'titular_cuenta',
            ]);

            $proveedor->update($request->validated());

            $this->auditoria->registrarEdicion(
                request: $request,
                modulo: 'MARKET_PROVEEDOR_CONFIG_BANCARIO',
                modelo: $proveedor,
                datosAnteriores: $datosAnteriores,
                descripcion: "Datos bancarios actualizados para '{$proveedor->nombre_empresa}'",
            );

            return response()->json([
                'message' => 'Datos bancarios actualizados correctamente',
                'data'    => $this->seccionBancario($proveedor->fresh()->load('banco:id,nombre,codigo')),
            ]);
        } catch (\Throwable $e) {
            Log::error('Market: error al actualizar configuración bancario', [
                'proveedor_id' => app()->bound('current_proveedor_id') ? app('current_proveedor_id') : null,
                'error'        => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Error al actualizar los datos bancarios',
                'code'    => 'INTERNAL_ERROR',
            ], 500);
        }
    }

    /**
     * PUT /api/v1/market/proveedor/configuracion/envios
     */
    public function updateEnvios(UpdateConfiguracionEnviosRequest $request): JsonResponse
    {
        try {
            /** @var MarketProveedor $proveedor */
            $proveedor = app('current_proveedor');

            $datosAnteriores = $proveedor->only([
                'transportadora_id', 'tiempo_preparacion_horas', 'monto_envio_gratis', 'permitir_recoger_tienda',
            ]);

            $proveedor->update($request->validated());

            $this->auditoria->registrarEdicion(
                request: $request,
                modulo: 'MARKET_PROVEEDOR_CONFIG_ENVIOS',
                modelo: $proveedor,
                datosAnteriores: $datosAnteriores,
                descripcion: "Configuración de envíos actualizada para '{$proveedor->nombre_empresa}'",
            );

            return response()->json([
                'message' => 'Configuración de envíos actualizada correctamente',
                'data'    => $this->seccionEnvios($proveedor->fresh()->load('transportadora:id,nombre,codigo')),
            ]);
        } catch (\Throwable $e) {
            Log::error('Market: error al actualizar configuración envíos', [
                'proveedor_id' => app()->bound('current_proveedor_id') ? app('current_proveedor_id') : null,
                'error'        => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Error al actualizar la configuración de envíos',
                'code'    => 'INTERNAL_ERROR',
            ], 500);
        }
    }

    /**
     * PUT /api/v1/market/proveedor/configuracion/notificaciones
     */
    public function updateNotificaciones(UpdateConfiguracionNotificacionesRequest $request): JsonResponse
    {
        try {
            /** @var MarketProveedor $proveedor */
            $proveedor = app('current_proveedor');

            $datosAnteriores = ['notificaciones_config' => $proveedor->notificaciones_config];

            $proveedor->update([
                'notificaciones_config' => $request->notificacionesData(),
            ]);

            $this->auditoria->registrarEdicion(
                request: $request,
                modulo: 'MARKET_PROVEEDOR_CONFIG_NOTIFICACIONES',
                modelo: $proveedor,
                datosAnteriores: $datosAnteriores,
                descripcion: "Preferencias de notificaciones actualizadas para '{$proveedor->nombre_empresa}'",
            );

            return response()->json([
                'message' => 'Preferencias de notificaciones actualizadas correctamente',
                'data'    => $this->seccionNotificaciones($proveedor->fresh()),
            ]);
        } catch (\Throwable $e) {
            Log::error('Market: error al actualizar notificaciones', [
                'proveedor_id' => app()->bound('current_proveedor_id') ? app('current_proveedor_id') : null,
                'error'        => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Error al actualizar las preferencias de notificaciones',
                'code'    => 'INTERNAL_ERROR',
            ], 500);
        }
    }

    // ─── Helpers privados ─────────────────────────────────────

    private function seccionGeneral(MarketProveedor $p): array
    {
        return [
            'nombre_empresa' => $p->nombre_empresa,
            'nit'            => $p->nit,
            'telefono'       => $p->telefono,
            'email'          => $p->email,
            'direccion'      => $p->direccion,
            'ciudad'         => $p->ciudad,
            'departamento'   => $p->departamento,
            'descripcion'    => $p->descripcion,
            'logo_url'       => $p->logo_url,
        ];
    }

    private function seccionBancario(MarketProveedor $p): array
    {
        return [
            'banco_id'       => $p->banco_id,
            'banco'          => $p->relationLoaded('banco') && $p->banco ? [
                'id'     => $p->banco->id,
                'nombre' => $p->banco->nombre,
                'codigo' => $p->banco->codigo,
            ] : null,
            'tipo_cuenta'    => $p->tipo_cuenta,
            'numero_cuenta'  => $p->numero_cuenta,
            'titular_cuenta' => $p->titular_cuenta,
        ];
    }

    private function seccionEnvios(MarketProveedor $p): array
    {
        return [
            'transportadora_id'        => $p->transportadora_id,
            'transportadora'           => $p->relationLoaded('transportadora') && $p->transportadora ? [
                'id'     => $p->transportadora->id,
                'nombre' => $p->transportadora->nombre,
                'codigo' => $p->transportadora->codigo,
            ] : null,
            'tiempo_preparacion_horas' => $p->tiempo_preparacion_horas,
            'monto_envio_gratis'       => $p->monto_envio_gratis,
            'permitir_recoger_tienda'  => (bool) $p->permitir_recoger_tienda,
        ];
    }

    private function seccionNotificaciones(MarketProveedor $p): array
    {
        $config = $p->notificaciones_config ?? [];
        return array_merge(self::NOTIFICACIONES_DEFAULTS, $config);
    }

    /**
     * Cuenta una etapa como completada si tiene sus campos requeridos llenos.
     */
    private function calcularEtapasCompletadas(MarketProveedor $p): int
    {
        $completadas = 0;

        // 1. General — siempre completa al crearse desde superadmin
        $generalOk = $p->nombre_empresa && $p->telefono && $p->email
            && $p->direccion && $p->ciudad && $p->departamento;
        if ($generalOk) $completadas++;

        // 2. Bancario
        $bancarioOk = $p->banco_id && $p->tipo_cuenta && $p->numero_cuenta && $p->titular_cuenta;
        if ($bancarioOk) $completadas++;

        // 3. Envíos
        $enviosOk = $p->transportadora_id && $p->tiempo_preparacion_horas !== null;
        if ($enviosOk) $completadas++;

        // 4. Notificaciones
        if (!empty($p->notificaciones_config)) $completadas++;

        return $completadas;
    }

    /**
     * Enmascara el número de cuenta: solo muestra los últimos 4 dígitos.
     * Ej: "1234567890" → "•••• 7890".
     */
    private function enmascararCuenta(?string $numero): ?string
    {
        if (!$numero) return null;
        if (strlen($numero) <= 4) return $numero;
        return '•••• ' . substr($numero, -4);
    }
}
