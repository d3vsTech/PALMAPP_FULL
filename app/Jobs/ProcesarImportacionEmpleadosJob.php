<?php

namespace App\Jobs;

use App\Models\Auditoria;
use App\Models\Empleado;
use App\Models\ImportacionEmpleados;
use App\Models\TenantConfig;
use Carbon\Carbon;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Throwable;

class ProcesarImportacionEmpleadosJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries   = 1;

    public function __construct(
        public int    $importacionId,
        public int    $tenantId,
        public int    $userId,
        public string $userName,
        public string $userEmail,
        public string $userIp,
        public string $userAgent,
    ) {}

    public function handle(): void
    {
        app()->instance('current_tenant_id', $this->tenantId);

        $importacion = ImportacionEmpleados::withoutGlobalScope('tenant')
            ->findOrFail($this->importacionId);

        if ($importacion->isTerminal()) {
            return;
        }

        $importacion->update([
            'estado'      => ImportacionEmpleados::ESTADO_PROCESANDO,
            'iniciado_at' => now(),
        ]);

        try {
            $absolutePath = Storage::disk('local')->path($importacion->archivo_path);
            $spreadsheet  = IOFactory::load($absolutePath);
            $sheet        = $spreadsheet->getActiveSheet();
            $rows         = $sheet->toArray(null, true, true, true);

            array_shift($rows); // eliminar fila de cabecera

            // Descartar filas donde todas las celdas son null o string vacío
            // (PhpSpreadsheet devuelve filas vacías hasta el límite de área usada del Excel)
            $rows = array_values(array_filter($rows, function ($row) {
                return count(array_filter($row, fn($v) => $v !== null && trim((string) $v) !== '')) > 0;
            }));

            if (count($rows) > 1000) {
                $importacion->update([
                    'estado'        => ImportacionEmpleados::ESTADO_FALLIDO,
                    'error_fatal'   => 'El archivo excede el límite de 1.000 filas permitidas por importación.',
                    'finalizado_at' => now(),
                ]);
                return;
            }

            $importacion->update(['total_filas' => count($rows)]);

            $smlv = TenantConfig::where('tenant_id', $this->tenantId)
                ->value('salario_minimo_vigente');

            // Fase 1 — Validar TODAS las filas en memoria (sin escribir en BD).
            [$filasValidas, $erroresValidacion] = $this->validateAllRows($rows, $smlv);

            // Si una sola fila falla validación, abortar sin crear nada (all-or-nothing).
            if (count($erroresValidacion) > 0) {
                usort($erroresValidacion, fn($a, $b) => $a['fila'] <=> $b['fila']);

                $importacion->update([
                    'estado'         => ImportacionEmpleados::ESTADO_CON_ERRORES,
                    'filas_exitosas' => 0,
                    'filas_fallidas' => count($erroresValidacion),
                    'resultados'     => $erroresValidacion,
                    'finalizado_at'  => now(),
                ]);

                $this->registrarAuditoria($importacion, 0, count($erroresValidacion));
                return;
            }

            // Fase 3 — Inserción atómica de todas las filas válidas en una única transacción.
            $resultadosExitos = [];

            DB::transaction(function () use ($filasValidas, &$resultadosExitos) {
                foreach (array_chunk($filasValidas, 100, true) as $chunk) {
                    foreach ($chunk as $rowIndex => $validated) {
                        $empleado = $this->insertEmpleadoYContrato($validated);

                        $resultadosExitos[] = [
                            'fila'      => $rowIndex,
                            'estado'    => 'exitoso',
                            'documento' => $empleado->documento,
                            'mensaje'   => "Colaborador '{$empleado->primer_nombre} {$empleado->primer_apellido}' creado correctamente",
                        ];
                    }
                }
            });

            $importacion->update([
                'estado'         => ImportacionEmpleados::ESTADO_COMPLETADO,
                'filas_exitosas' => count($filasValidas),
                'filas_fallidas' => 0,
                'resultados'     => $resultadosExitos,
                'finalizado_at'  => now(),
            ]);

            $this->registrarAuditoria($importacion, count($filasValidas), 0);

        } catch (Throwable $e) {
            $importacion->update([
                'estado'        => ImportacionEmpleados::ESTADO_FALLIDO,
                'error_fatal'   => 'Error fatal al procesar el archivo: ' . $e->getMessage(),
                'finalizado_at' => now(),
            ]);
            Log::error('ProcesarImportacionEmpleadosJob falló', [
                'importacion_id' => $this->importacionId,
                'exception'      => $e->getMessage(),
                'trace'          => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Valida todas las filas en memoria (sin escribir en BD) y detecta duplicados intra-archivo.
     *
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>}
     *         [filasValidas (indexadas por número de fila), erroresValidacion]
     */
    private function validateAllRows(array $rows, ?float $smlv): array
    {
        $filasValidas      = [];
        $erroresValidacion = [];

        foreach ($rows as $rowIndex => $cells) {
            $data      = $this->mapRow($cells, $smlv);
            $validator = $this->makeValidator($data);

            if ($validator->fails()) {
                $erroresValidacion[] = [
                    'fila'      => $rowIndex,
                    'estado'    => 'fallido',
                    'documento' => $data['documento'] ?? null,
                    'mensaje'   => implode(' | ', Arr::flatten($validator->errors()->toArray())),
                ];
                continue;
            }

            $filasValidas[$rowIndex] = $validator->validated();
        }

        // Validación intra-archivo: documento debe ser único dentro del propio Excel.
        $porDocumento = [];
        foreach ($filasValidas as $rowIndex => $validated) {
            $doc = $validated['documento'] ?? null;
            if ($doc === null) {
                continue;
            }
            $porDocumento[$doc][] = $rowIndex;
        }

        foreach ($porDocumento as $documento => $filas) {
            if (count($filas) <= 1) {
                continue;
            }

            $filasStr = implode(', ', $filas);
            foreach ($filas as $rowIndex) {
                $erroresValidacion[] = [
                    'fila'      => $rowIndex,
                    'estado'    => 'fallido',
                    'documento' => $documento,
                    'mensaje'   => "documento: El documento aparece duplicado en las filas {$filasStr} del archivo",
                ];
                unset($filasValidas[$rowIndex]);
            }
        }

        return [$filasValidas, $erroresValidacion];
    }

    private function insertEmpleadoYContrato(array $validated): Empleado
    {
        $empleado = Empleado::create($validated);

        $empleado->contratos()->create([
            'fecha_inicio'      => $empleado->fecha_ingreso,
            'fecha_terminacion' => $empleado->fecha_retiro,
            'salario'           => $empleado->salario_base,
            'estado_contrato'   => $empleado->fecha_retiro ? 'TERMINADO' : 'VIGENTE',
        ]);

        return $empleado;
    }

    private function mapRow(array $cells, ?float $smlv): array
    {
        $v = fn($col) => (isset($cells[$col]) && $cells[$col] !== '' && $cells[$col] !== null)
            ? trim((string) $cells[$col])
            : null;

        $d = function ($col) use ($cells) {
            $raw = isset($cells[$col]) && $cells[$col] !== '' && $cells[$col] !== null
                ? trim((string) $cells[$col])
                : null;
            if ($raw === null) {
                return null;
            }
            try {
                return Carbon::parse($raw)->format('Y-m-d');
            } catch (Throwable $e) {
                return $raw;
            }
        };

        // Documento puede llegar como float de Excel (ej. 12345678.0) → castear a entero-string
        $documento = null;
        if (isset($cells['F']) && $cells['F'] !== '' && $cells['F'] !== null) {
            $raw = $cells['F'];
            $documento = is_float($raw) ? (string)(int)$raw : trim((string)$raw);
        }

        $modalidad   = $v('K');
        $salarioRaw  = $v('L');

        // Replicar prepareForValidation de StoreEmpleadoRequest
        if ($modalidad === 'PRODUCCION' && $salarioRaw === null && $smlv !== null) {
            $salarioRaw = (string) $smlv;
        }

        return [
            'primer_nombre'               => $v('A'),
            'segundo_nombre'              => $v('B'),
            'primer_apellido'             => $v('C'),
            'segundo_apellido'            => $v('D'),
            'tipo_documento'              => $v('E'),
            'documento'                   => $documento,
            'fecha_nacimiento'            => $d('G'),
            'fecha_expedicion_documento'  => $d('H'),
            'lugar_expedicion'            => $v('I'),
            'cargo'                       => $v('J'),
            'modalidad_pago'              => $modalidad,
            'salario_base'                => $salarioRaw,
            'fecha_ingreso'               => $d('M'),
            'fecha_retiro'                => $d('N'),
            'eps'                         => $v('O'),
            'fondo_pension'               => $v('P'),
            'arl'                         => $v('Q'),
            'caja_compensacion'           => $v('R'),
            'talla_camisa'                => $v('S'),
            'talla_pantalon'              => $v('T'),
            'talla_calzado'               => $v('U'),
            'tipo_cuenta'                 => $v('V'),
            'entidad_bancaria'            => $v('W'),
            'numero_cuenta'               => $v('X'),
            'correo_electronico'          => $v('Y'),
            'telefono'                    => $v('Z'),
            'direccion'                   => $v('AA'),
            'municipio'                   => $v('AB'),
            'departamento'                => $v('AC'),
            'contacto_emergencia_nombre'  => $v('AD'),
            'contacto_emergencia_telefono'=> $v('AE'),
        ];
    }

    private function makeValidator(array $data): \Illuminate\Validation\Validator
    {
        $tenantId = $this->tenantId;

        $rules = [
            'primer_nombre'               => 'required|string|max:50',
            'segundo_nombre'              => 'nullable|string|max:50',
            'primer_apellido'             => 'required|string|max:50',
            'segundo_apellido'            => 'nullable|string|max:50',
            'tipo_documento'              => 'required|in:CC,TI,PASAPORTE,CE,PPT',
            'documento'                   => [
                'required', 'string', 'max:50',
                Rule::unique('empleados', 'documento')
                    ->where(fn($q) => $q->where('tenant_id', $tenantId)->whereNull('deleted_at')),
            ],
            'fecha_nacimiento'            => 'required|date|before_or_equal:' . now()->subYears(14)->toDateString(),
            'fecha_expedicion_documento'  => 'required|date|before_or_equal:today',
            'lugar_expedicion'            => 'nullable|string|max:100',
            'cargo'                       => 'required|string|max:100',
            'salario_base'                => 'required_if:modalidad_pago,FIJO|nullable|numeric|min:0|max:999999999999.99',
            'modalidad_pago'              => 'required|in:FIJO,PRODUCCION',
            'fecha_ingreso'               => 'required|date|before_or_equal:today',
            'fecha_retiro'                => 'nullable|date|after_or_equal:fecha_ingreso',
            'eps'                         => 'nullable|string|max:50',
            'fondo_pension'               => 'nullable|string|max:50',
            'arl'                         => 'nullable|string|max:50',
            'caja_compensacion'           => 'nullable|string|max:50',
            'talla_camisa'                => 'nullable|string|max:10',
            'talla_pantalon'              => 'nullable|string|max:10',
            'talla_calzado'               => 'nullable|string|max:5',
            'tipo_cuenta'                 => 'nullable|in:AHORROS,CORRIENTE,EFECTIVO',
            'entidad_bancaria'            => 'nullable|string|max:50',
            'numero_cuenta'               => 'nullable|string|max:30',
            'correo_electronico'          => 'nullable|email|max:100',
            'telefono'                    => 'nullable|string|max:50',
            'direccion'                   => 'nullable|string|max:200',
            'municipio'                   => 'nullable|string|max:100',
            'departamento'                => 'nullable|string|max:100',
            'contacto_emergencia_nombre'  => 'nullable|string|max:100',
            'contacto_emergencia_telefono'=> 'nullable|string|max:50',
        ];

        $validator = Validator::make($data, $rules);

        // Replicar withValidator de StoreEmpleadoRequest
        $validator->after(function ($v) use ($data) {
            if (($data['modalidad_pago'] ?? '') === 'PRODUCCION' && empty($data['salario_base'])) {
                $v->errors()->add(
                    'salario_base',
                    'No hay salario mínimo vigente configurado en el tenant. Configúralo en Ajustes o envía salario_base explícito.'
                );
            }
        });

        return $validator;
    }

    private function registrarAuditoria(ImportacionEmpleados $importacion, int $exitosas, int $fallidas): void
    {
        try {
            Auditoria::create([
                'tenant_id'     => $this->tenantId,
                'user_id'       => $this->userId,
                'usuario'       => $this->userName,
                'correo'        => $this->userEmail,
                'accion'        => 'IMPORTACION_MASIVA',
                'modulo'        => 'COLABORADORES',
                'observaciones' => "Importación masiva finalizada: {$exitosas} exitosas, {$fallidas} fallidas de {$importacion->total_filas} filas. Archivo: {$importacion->nombre_archivo_original}",
                'direccion_ip'  => $this->userIp,
                'user_agent'    => $this->userAgent,
                'datos_nuevos'  => [
                    'importacion_id'  => $importacion->id,
                    'total_filas'     => $importacion->total_filas,
                    'filas_exitosas'  => $exitosas,
                    'filas_fallidas'  => $fallidas,
                    'estado_final'    => $importacion->estado,
                ],
            ]);
        } catch (Throwable $e) {
            Log::error('No se pudo registrar auditoría de importación masiva', [
                'importacion_id' => $importacion->id,
                'error'          => $e->getMessage(),
            ]);
        }
    }

    public function failed(Throwable $e): void
    {
        app()->instance('current_tenant_id', $this->tenantId);

        ImportacionEmpleados::withoutGlobalScope('tenant')
            ->where('id', $this->importacionId)
            ->whereNotIn('estado', [
                ImportacionEmpleados::ESTADO_COMPLETADO,
                ImportacionEmpleados::ESTADO_CON_ERRORES,
                ImportacionEmpleados::ESTADO_FALLIDO,
            ])
            ->update([
                'estado'        => ImportacionEmpleados::ESTADO_FALLIDO,
                'error_fatal'   => 'El job falló inesperadamente: ' . $e->getMessage(),
                'finalizado_at' => now(),
            ]);

        Log::error('ProcesarImportacionEmpleadosJob::failed', [
            'importacion_id' => $this->importacionId,
            'exception'      => $e->getMessage(),
        ]);
    }
}
