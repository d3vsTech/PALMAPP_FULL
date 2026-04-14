<?php

namespace App\Http\Controllers\Api;

use App\Constants\DocumentoCategoria;
use App\Http\Controllers\Controller;
use App\Http\Requests\EmpleadoDocumento\StoreEmpleadoDocumentoRequest;
use App\Models\Empleado;
use App\Models\EmpleadoDocumento;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmpleadoDocumentoController extends Controller
{
    public function __construct(
        protected AuditoriaService $auditoria,
    ) {}

    /**
     * Retorna las categorías y tipos de documento disponibles.
     */
    public function categorias(): JsonResponse
    {
        return response()->json(['data' => DocumentoCategoria::CATEGORIAS]);
    }

    /**
     * Lista los documentos de un colaborador.
     */
    public function index(Request $request, Empleado $empleado): JsonResponse
    {
        try {
            $documentos = $empleado->documentos()
                ->with('subidoPor:id,name')
                ->when($request->categoria, fn($q, $c) => $q->where('categoria', $c))
                ->orderBy('categoria')
                ->orderBy('tipo_documento')
                ->orderByDesc('created_at')
                ->get()
                ->makeHidden('archivo_path');

            return response()->json(['data' => $documentos]);
        } catch (\Throwable $e) {
            Log::error('Error al listar documentos del colaborador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al listar los documentos', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Sube un documento para un colaborador.
     */
    public function store(StoreEmpleadoDocumentoRequest $request, Empleado $empleado): JsonResponse
    {
        try {
            $documento = DB::transaction(function () use ($request, $empleado) {
                $tenantId = app('current_tenant_id');
                $file = $request->file('archivo');
                $categoria = $request->categoria;
                $tipoDocumento = $request->tipo_documento;

                // Si la categoría es única por tipo, reemplazar documento existente
                if (DocumentoCategoria::esUnicoPorTipo($categoria)) {
                    $existente = $empleado->documentos()
                        ->where('categoria', $categoria)
                        ->where('tipo_documento', $tipoDocumento)
                        ->first();

                    if ($existente) {
                        Storage::disk('local')->delete($existente->archivo_path);

                        $this->auditoria->registrarEliminacion(
                            $request, 'COLABORADORES', $existente,
                            "Se reemplazó documento '{$tipoDocumento}' del colaborador '{$empleado->nombre_completo}'"
                        );

                        $existente->delete();
                    }
                }

                // Almacenar archivo
                $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
                $storagePath = "tenants/{$tenantId}/empleados/{$empleado->id}/documentos";
                $path = $file->storeAs($storagePath, $filename, 'local');

                // Crear registro
                $documento = EmpleadoDocumento::create([
                    'empleado_id'            => $empleado->id,
                    'categoria'              => $categoria,
                    'tipo_documento'         => $tipoDocumento,
                    'nombre_archivo'         => $request->nombre_archivo ?? $file->getClientOriginalName(),
                    'archivo_path'           => $path,
                    'archivo_nombre_original' => $file->getClientOriginalName(),
                    'mime_type'              => $file->getClientMimeType(),
                    'archivo_tamano'         => $file->getSize(),
                    'fecha_documento'        => $request->fecha_documento,
                    'observacion'            => $request->observacion,
                    'subido_por'             => $request->user()->id,
                ]);

                $this->auditoria->registrarCreacion(
                    $request, 'COLABORADORES', $documento,
                    "Se subió documento '{$tipoDocumento}' para el colaborador '{$empleado->nombre_completo}'"
                );

                return $documento;
            });

            return response()->json([
                'message' => 'Documento subido correctamente',
                'data'    => $documento->load('subidoPor:id,name')->makeHidden('archivo_path'),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['message' => 'Error de validación', 'errors' => $e->errors()], 422);
        } catch (\Throwable $e) {
            Log::error('Error al subir documento del colaborador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al subir el documento', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Muestra los metadatos de un documento.
     */
    public function show(Empleado $empleado, EmpleadoDocumento $documento): JsonResponse
    {
        try {
            abort_if($documento->empleado_id !== $empleado->id, 404, 'Documento no encontrado');

            return response()->json([
                'data' => $documento->load('subidoPor:id,name')->makeHidden('archivo_path'),
            ]);
        } catch (\Throwable $e) {
            Log::error('Error al obtener documento del colaborador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al obtener el documento', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Descarga el archivo de un documento.
     */
    public function download(Empleado $empleado, EmpleadoDocumento $documento)
    {
        try {
            abort_if($documento->empleado_id !== $empleado->id, 404, 'Documento no encontrado');

            if (! Storage::disk('local')->exists($documento->archivo_path)) {
                return response()->json(['message' => 'Archivo no encontrado en el servidor'], 404);
            }

            return Storage::disk('local')->download(
                $documento->archivo_path,
                $documento->archivo_nombre_original,
                ['Content-Type' => $documento->mime_type]
            );
        } catch (\Throwable $e) {
            Log::error('Error al descargar documento del colaborador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al descargar el documento', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Elimina un documento.
     */
    public function destroy(Request $request, Empleado $empleado, EmpleadoDocumento $documento): JsonResponse
    {
        try {
            abort_if($documento->empleado_id !== $empleado->id, 404, 'Documento no encontrado');

            // Eliminar archivo del disco
            if (Storage::disk('local')->exists($documento->archivo_path)) {
                Storage::disk('local')->delete($documento->archivo_path);
            } else {
                Log::warning("Archivo no encontrado en disco al eliminar documento #{$documento->id}: {$documento->archivo_path}");
            }

            $tipoDocumento = $documento->tipo_documento;

            $this->auditoria->registrarEliminacion(
                $request, 'COLABORADORES', $documento,
                "Se eliminó documento '{$tipoDocumento}' del colaborador '{$empleado->nombre_completo}'"
            );

            $documento->delete();

            return response()->json(['message' => "Documento '{$tipoDocumento}' eliminado correctamente"]);
        } catch (\Throwable $e) {
            Log::error('Error al eliminar documento del colaborador: ' . $e->getMessage());
            return response()->json(['message' => 'Error al eliminar el documento', 'error' => $e->getMessage()], 500);
        }
    }
}
