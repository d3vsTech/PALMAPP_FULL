<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TenantSettingsController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * PUT /api/v1/tenant/configuracion/finca
     *
     * Edita los datos básicos de la finca (tenant actual).
     * Permiso requerido: configuracion.editar
     */
    public function updateFinca(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'nombre'          => 'sometimes|string|max:100',
                'tipo_persona'    => 'sometimes|in:NATURAL,JURIDICA',
                'nit'             => 'sometimes|string|max:20',
                'razon_social'    => 'sometimes|string|max:200',
                'correo_contacto' => 'sometimes|email|max:100',
                'telefono'        => 'sometimes|string|max:20',
                'direccion'       => 'sometimes|nullable|string|max:200',
                'departamento'    => 'sometimes|string|max:100',
                'municipio'       => 'sometimes|string|max:100',
                'logo'            => 'sometimes|nullable|image|mimes:jpeg,jpg,png,webp|max:2048',
            ], [
                'nombre.max'            => 'El nombre no puede exceder 100 caracteres',
                'tipo_persona.in'       => 'El tipo de persona debe ser NATURAL o JURIDICA',
                'nit.max'               => 'El NIT no puede exceder 20 caracteres',
                'razon_social.max'      => 'La razón social no puede exceder 200 caracteres',
                'correo_contacto.email' => 'El correo de contacto debe ser válido',
                'telefono.max'          => 'El teléfono no puede exceder 20 caracteres',
                'direccion.max'         => 'La dirección no puede exceder 200 caracteres',
                'departamento.max'      => 'El departamento no puede exceder 100 caracteres',
                'municipio.max'         => 'El municipio no puede exceder 100 caracteres',
                'logo.image'            => 'El logo debe ser una imagen',
                'logo.mimes'            => 'El logo debe ser formato jpeg, jpg, png o webp',
                'logo.max'              => 'El logo no puede exceder 2MB',
            ]);

            $tenantId = app('current_tenant_id');
            $tenant = Tenant::findOrFail($tenantId);

            $datosAnteriores = $tenant->only([
                'nombre', 'tipo_persona', 'nit', 'razon_social',
                'correo_contacto', 'telefono', 'direccion',
                'departamento', 'municipio', 'logo_url',
            ]);

            // Validar NIT único si se está cambiando
            if ($request->filled('nit') && $request->nit !== $tenant->nit) {
                $existeNit = Tenant::where('nit', $request->nit)
                    ->where('id', '!=', $tenantId)
                    ->exists();

                if ($existeNit) {
                    return response()->json([
                        'message' => 'Ya existe otra finca con este NIT',
                        'code'    => 'NIT_DUPLICATED',
                    ], 422);
                }
            }

            // Campos editables
            $campos = $request->only([
                'nombre', 'tipo_persona', 'nit', 'razon_social',
                'correo_contacto', 'telefono', 'direccion',
                'departamento', 'municipio',
            ]);

            // Procesar logo
            if ($request->hasFile('logo')) {
                // Eliminar logo anterior si existe
                if ($tenant->logo_url) {
                    Storage::disk('public')->delete($tenant->logo_url);
                }

                $path = $request->file('logo')->store(
                    "tenants/{$tenantId}/logo",
                    'public'
                );
                $campos['logo_url'] = $path;
            }

            if (empty($campos)) {
                return response()->json([
                    'message' => 'No se enviaron datos para actualizar',
                    'code'    => 'NO_DATA',
                ], 422);
            }

            $tenant->update($campos);

            $this->auditoria->registrarEdicion(
                $request,
                'CONFIGURACION',
                $tenant,
                $datosAnteriores,
                "Se editaron los datos de la finca '{$tenant->nombre}'",
            );

            return response()->json([
                'message' => 'Datos de la finca actualizados correctamente',
                'data'    => [
                    'id'              => $tenant->id,
                    'nombre'          => $tenant->nombre,
                    'tipo_persona'    => $tenant->tipo_persona,
                    'nit'             => $tenant->nit,
                    'razon_social'    => $tenant->razon_social,
                    'correo_contacto' => $tenant->correo_contacto,
                    'telefono'        => $tenant->telefono,
                    'direccion'       => $tenant->direccion,
                    'departamento'    => $tenant->departamento,
                    'municipio'       => $tenant->municipio,
                    'logo_url'        => $tenant->logo_url
                        ? Storage::disk('public')->url($tenant->logo_url)
                        : null,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Error al actualizar datos de finca: ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al actualizar los datos de la finca',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
