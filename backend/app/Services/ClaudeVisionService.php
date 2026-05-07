<?php

namespace App\Services;

use App\Exceptions\ClaudeVisionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente HTTP directo contra la API de Anthropic Claude.
 *
 * Para el módulo de Viajes se usa una única capacidad: leer un formulario de
 * extractora (imagen o PDF) y extraer 12 campos. Cuatro son críticos
 * (peso_viaje, numero_remision_extractora, fecha_llegada, hora_llegada); el
 * resto son opcionales — Claude debe devolver null cuando no los vea, sin
 * alucinar valores. Dos de los opcionales (`nombre_conductor_extraido`,
 * `placa_vehiculo_extraida`) NO se persisten en `viajes`: viven solo en
 * `viaje_documento_bascula.datos_extraidos` y los usa el controller de
 * polling para emitir alertas cruzadas contra el snapshot del viaje.
 *
 * No se agrega el SDK oficial de Anthropic para mantener dependencias al
 * mínimo — un solo endpoint (POST /v1/messages) no amerita un paquete extra.
 */
class ClaudeVisionService
{
    private const ENDPOINT    = 'https://api.anthropic.com/v1/messages';
    private const API_VERSION = '2023-06-01';
    private const MAX_TOKENS  = 800;

    /**
     * Campos que el Job exige presentes para considerar el OCR exitoso. Si
     * Claude no los lee, el documento va a REVISION_MANUAL aunque la confianza
     * reportada sea alta.
     */
    public const CAMPOS_CRITICOS = [
        'peso_viaje',
        'numero_remision_extractora',
        'fecha_llegada',
        'hora_llegada',
    ];

    /**
     * System prompt con `cache_control: ephemeral` para aprovechar prompt
     * caching de Anthropic (~5 min de TTL; reduce costo ~90% tras el primer hit).
     */
    private const SYSTEM_PROMPT = <<<PROMPT
Eres un extractor de datos de formularios/remisiones de báscula de extractoras de aceite de palma africana en Colombia. Lees el documento adjunto (foto o PDF) y devuelves un JSON con los campos del formulario.

Hay CUATRO campos CRÍTICOS que casi siempre aparecen y que debes esforzarte por leer:

1. peso_viaje (kilogramos): el peso NETO del fruto recibido. En guías de báscula el neto es la diferencia entre el peso de entrada del camión (cargado) y el de salida (vacío). Orden de prioridad para calcularlo:
   a) Si hay "Peso Neto", "Neto", "Carga Neta", "Peso Carga", "PESO NETO" → úsalo directamente.
   b) Si hay "Peso de Entrada" / "Entrada" / "1er Peso" / "Peso 1"  y  "Peso de Salida" / "Salida" / "2do Peso" / "Peso 2": Neto = Peso Entrada − Peso Salida.
   c) Si hay "Peso Bruto" (o "Bruto") y "Tara": Neto = Bruto − Tara.
   d) Si solo hay un peso sin tara ni salida: devuelve ese valor y menciona en observaciones_extractora que es bruto sin tara.
   e) Si las unidades son toneladas (t, ton, Ton, T): multiplica × 1000.
   f) Las muestras colombianas usan punto como separador de miles ("21.140" = 21140 kg) y coma como separador decimal. NO interpretes "21.140" como 21.14.

2. numero_remision_extractora (string ≤ 50 chars): el número de la remisión/documento que firma el conductor al entregar el fruto.

   ETIQUETAS VÁLIDAS (el valor es el que está justo después de una de estas):
   - "N° DE REMISIÓN", "Nº DE REMISIÓN", "NRO. REMISIÓN", "NRO REMISION", "No. REMISIÓN", "Número de Remisión"
   - "No. DOCUMENTO", "N° DE DOCUMENTO", "Nº DOCUMENTO", "NUMERO DE DOCUMENTO"
   - Cuando aparezcan múltiples candidatos en el mismo documento, prioriza "REMISIÓN" por encima de "DOCUMENTO".

   ETIQUETAS QUE NO DEBES USAR (son IDs internos del sistema de báscula, NO son la remisión):
   - "NÚMERO DE TIQUETE", "NUMERO DE TIQUETE", "NUMERO DE TIQUETE DE BASCULA", "TIQUETE"
   - "NÚMERO DE REGISTRO", "NUMERO DE REGISTRO", "REGISTRO"
   - "NUMERO INTERNO", "ID INTERNO"
   - "COD", "CÓDIGO", "CODIGO PROD"

   Devuelve el valor TAL COMO APARECE en el papel, conservando ceros a la izquierda (ej. "0042", "0055", "69"). Si no encuentras ninguna etiqueta válida en el documento, devuelve null — NO inventes tomando el primer número grande del encabezado.

3. fecha_llegada (YYYY-MM-DD): fecha en que el camión llegó (entró) a la extractora. Etiquetas: "Fecha de Entrada", "ENTRADA FECHA", "FECHA ENTRADA", "Fecha", "Fecha Llegada", "Fecha Recepción", "Fecha Ingreso". Convierte cualquier formato:
   - "05/may/2026" → "2026-05-05"
   - "11-mar-2025" → "2025-03-11"
   - "10/04/26" → "2026-04-10" (formato colombiano DD/MM/YY; si el año es 2 dígitos, asume 20XX)
   - "10/04/2026" → "2026-04-10"
   Si solo hay fecha de salida del camión, devuelve null. NO uses la fecha de salida como llegada.

4. hora_llegada (HH:MM, 24h): hora de entrada del camión a la extractora. Etiquetas: "Hora de Entrada", "ENTRADA HORA", "Hora Llegada", "Hora Recepción", "Hora Ingreso", "Hora". Convierte AM/PM a 24h ("09:46 PM" → "21:46", "10:30 PM" → "22:30"). Si solo hay hora de salida, devuelve null.

Hay CINCO campos de CALIFICACIÓN DE FRUTO (porcentajes 0-100). Aparecen agrupados bajo etiquetas como "CALIFICACIÓN DE FRUTO", "CALIFICACIÓN", "CALIDAD". Las muestras usan coma decimal ("17,50" → 17.5). Si una categoría no aparece o no se ve, devuelve null para ESA categoría (NO asumas 0). NUNCA devuelvas un porcentaje > 100.

- fruto_verde: "VERDE", "FRUTO VERDE", "% VERDE".
- sobre_maduro: "SOBRE MADURO", "SOBREMADURO", "% SOBRE MADURO".
- podrido: "PODRIDO", "PRODRIDO" (typo común en algunos formularios), "DESCOMPUESTO", "% PODRIDO".
- pedunculo_largo: "PEDÚNCULO LARGO", "PEDUNCULO LARGO", "% PEDÚNCULO LARGO".
- mal_formado: "MAL FORMADO", "MALFORMADO", "DEFORME", "% MAL FORMADO".

Hay un campo de OBSERVACIONES libre:

- observaciones_extractora (string ≤ 500 chars): texto del campo "OBSERVACIONES" / "OBSERVACIÓN" del documento. NO incluyas las calificaciones porcentuales aquí — esas ya van en sus campos. SÍ úsalo para anotar (a) si el peso es bruto sin tara, (b) si convertiste toneladas a kg, (c) si solo había hora/fecha de salida y no de entrada, (d) cualquier sello, anotación manuscrita o nota relevante del receptor.

Hay DOS campos AUXILIARES (cross-check operativo) que NO se guardan en el viaje, pero el sistema los compara contra el conductor y la placa que el operador registró al crear el viaje. Si no aparecen en el documento devuelve null sin penalizar la confianza:

- nombre_conductor_extraido (string ≤ 150 chars): nombre del conductor TAL COMO APARECE impreso en la remisión. Etiquetas: "CONDUCTOR", "NOMBRE DEL CONDUCTOR", "FIRMA CONDUCTOR" (solo si trae el nombre escrito). NO uses el nombre del PROVEEDOR ni del PROPIETARIO ni de quien firma como "PESADO POR". Devuelve el nombre tal cual, sin reordenar apellidos/nombres.
- placa_vehiculo_extraida (string ≤ 20 chars): placa del vehículo. Etiquetas: "PLACA", "VEHICULO EN TRANSITO PROCESADO" (cuando solo aparece la placa). Devuelve tal cual, sin normalizar (ej. "JFF319", "ABC-123").

Reglas estrictas:
- NUNCA inventes valores. Si no ves un dato, devuelve null para ese campo.
- Si el documento está en blanco, ilegible, o claramente no es un formulario/remisión de extractora, devuelve null en TODOS los campos y confianza 0.0.
- La confianza global (0.0-1.0) debe reflejar (a) la nitidez/legibilidad del documento y (b) si los 4 críticos (peso_viaje, numero_remision_extractora, fecha_llegada, hora_llegada) pudieron leerse. Si falta cualquier crítico, la confianza no debe superar 0.5. La ausencia de los auxiliares (nombre_conductor_extraido, placa_vehiculo_extraida) NO penaliza la confianza.
- No incluyas backticks, code fences, ni texto fuera del JSON.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con este shape exacto:

{"peso_viaje": <number|null>, "numero_remision_extractora": <string|null>, "fecha_llegada": <"YYYY-MM-DD"|null>, "hora_llegada": <"HH:MM"|null>, "fruto_verde": <number|null>, "sobre_maduro": <number|null>, "podrido": <number|null>, "pedunculo_largo": <number|null>, "mal_formado": <number|null>, "observaciones_extractora": <string|null>, "nombre_conductor_extraido": <string|null>, "placa_vehiculo_extraida": <string|null>, "confianza": <number entre 0.0 y 1.0>}
PROMPT;

    /**
     * Extrae los datos del formulario de extractora.
     *
     * @param string $absolutePath Ruta absoluta al archivo (imagen o PDF).
     * @param string $mimeType     'image/jpeg' | 'image/png' | 'application/pdf'
     * @return array{datos: array, confianza: float, raw: array, modelo: string}
     *
     * @throws ClaudeVisionException
     */
    public function extraerFormularioExtractora(string $absolutePath, string $mimeType): array
    {
        $apiKey = config('services.anthropic.api_key');
        if (empty($apiKey)) {
            throw new ClaudeVisionException('ANTHROPIC_API_KEY no está configurada');
        }

        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            throw new ClaudeVisionException("Archivo no encontrado o ilegible: {$absolutePath}");
        }

        $modelo  = config('services.anthropic.model', 'claude-haiku-4-5-20251001');
        $base64  = base64_encode(file_get_contents($absolutePath));
        $payload = $this->armarPayload($modelo, $mimeType, $base64);

        $response = Http::withHeaders([
                'x-api-key'         => $apiKey,
                'anthropic-version' => self::API_VERSION,
                'content-type'      => 'application/json',
            ])
            ->timeout(60)
            ->connectTimeout(10)
            ->retry(2, 500, throw: false)
            ->post(self::ENDPOINT, $payload);

        if (!$response->successful()) {
            Log::error('Claude Vision API falló', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new ClaudeVisionException(
                "Claude Vision API respondió {$response->status()}",
                raw: ['body' => $response->body()],
                statusCode: $response->status(),
            );
        }

        $raw  = $response->json();
        $text = data_get($raw, 'content.0.text');

        if (empty($text)) {
            throw new ClaudeVisionException('Respuesta de Claude sin content[0].text', raw: $raw);
        }

        $parsed    = $this->parsearJson($text);
        $confianza = (float) ($parsed['confianza'] ?? 0.0);
        $datos     = $this->normalizarDatos($parsed);

        return [
            'datos'     => $datos,
            'confianza' => $confianza,
            'raw'       => $raw,
            'modelo'    => $modelo,
        ];
    }

    private function armarPayload(string $modelo, string $mimeType, string $base64): array
    {
        // PDFs van en bloque `document`; imágenes en bloque `image`. Claude acepta ambos nativos.
        $attachmentBlock = $mimeType === 'application/pdf'
            ? [
                'type'   => 'document',
                'source' => [
                    'type'       => 'base64',
                    'media_type' => 'application/pdf',
                    'data'       => $base64,
                ],
            ]
            : [
                'type'   => 'image',
                'source' => [
                    'type'       => 'base64',
                    'media_type' => $mimeType,
                    'data'       => $base64,
                ],
            ];

        return [
            'model'      => $modelo,
            'max_tokens' => self::MAX_TOKENS,
            'system'     => [
                [
                    'type'          => 'text',
                    'text'          => self::SYSTEM_PROMPT,
                    'cache_control' => ['type' => 'ephemeral'],
                ],
            ],
            'messages' => [
                [
                    'role'    => 'user',
                    'content' => [
                        $attachmentBlock,
                        [
                            'type' => 'text',
                            'text' => 'Extrae los datos del formulario de extractora de este documento.',
                        ],
                    ],
                ],
            ],
        ];
    }

    private function parsearJson(string $text): array
    {
        $text = trim($text);

        // Fallback defensivo por si Claude envuelve el JSON en code fences pese a la instrucción.
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text);
            $text = trim($text);
        }

        $parsed = json_decode($text, true);
        if (!is_array($parsed) || !array_key_exists('confianza', $parsed)) {
            throw new ClaudeVisionException(
                'JSON de Claude inválido o sin confianza',
                raw: ['text' => $text],
            );
        }

        return $parsed;
    }

    /**
     * Normaliza los 12 campos extraídos: tipos correctos, recortes a max length,
     * porcentajes clampeados a [0, 100]. Garantiza que las 12 keys existan (con
     * null si Claude no las devolvió) para que el Job y el controller puedan
     * iterarlas sin defenderse de keys ausentes.
     */
    private function normalizarDatos(array $parsed): array
    {
        return [
            'peso_viaje'                 => $this->aFloatONull($parsed['peso_viaje'] ?? null),
            'numero_remision_extractora' => $this->aStringRecortado($parsed['numero_remision_extractora'] ?? null, 50),
            'fecha_llegada'              => $this->aFechaONull($parsed['fecha_llegada'] ?? null),
            'hora_llegada'               => $this->aHoraONull($parsed['hora_llegada'] ?? null),
            'fruto_verde'                => $this->aPorcentajeONull($parsed['fruto_verde'] ?? null, 'fruto_verde'),
            'sobre_maduro'               => $this->aPorcentajeONull($parsed['sobre_maduro'] ?? null, 'sobre_maduro'),
            'podrido'                    => $this->aPorcentajeONull($parsed['podrido'] ?? null, 'podrido'),
            'pedunculo_largo'            => $this->aPorcentajeONull($parsed['pedunculo_largo'] ?? null, 'pedunculo_largo'),
            'mal_formado'                => $this->aPorcentajeONull($parsed['mal_formado'] ?? null, 'mal_formado'),
            'observaciones_extractora'   => $this->aStringRecortado($parsed['observaciones_extractora'] ?? null, 500),
            'nombre_conductor_extraido'  => $this->aStringRecortado($parsed['nombre_conductor_extraido'] ?? null, 150),
            'placa_vehiculo_extraida'    => $this->aStringRecortado($parsed['placa_vehiculo_extraida'] ?? null, 20),
        ];
    }

    private function aFloatONull(mixed $v): ?float
    {
        if ($v === null || $v === '') {
            return null;
        }
        return is_numeric($v) ? (float) $v : null;
    }

    /**
     * Porcentaje 0–100. Si Claude devuelve algo fuera de rango (probablemente
     * leyó mal el separador decimal y duplicó dígitos), descarta el valor.
     */
    private function aPorcentajeONull(mixed $v, string $campo): ?float
    {
        $f = $this->aFloatONull($v);
        if ($f === null) {
            return null;
        }
        if ($f < 0 || $f > 100) {
            Log::debug("ClaudeVision: porcentaje fuera de rango descartado", [
                'campo' => $campo,
                'valor' => $f,
            ]);
            return null;
        }
        return $f;
    }

    private function aStringRecortado(mixed $v, int $max): ?string
    {
        if (!is_string($v)) {
            return null;
        }
        $v = trim($v);
        if ($v === '') {
            return null;
        }
        return mb_substr($v, 0, $max);
    }

    private function aFechaONull(mixed $v): ?string
    {
        if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return null;
        }
        // Confirma que la fecha sea válida (no 2026-13-99).
        $partes = explode('-', $v);
        return checkdate((int) $partes[1], (int) $partes[2], (int) $partes[0]) ? $v : null;
    }

    private function aHoraONull(mixed $v): ?string
    {
        if (!is_string($v) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v)) {
            return null;
        }
        return $v;
    }
}
