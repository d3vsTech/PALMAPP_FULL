<?php

namespace App\Services;

use App\Exceptions\ClaudeVisionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente HTTP directo contra la API de Anthropic Claude.
 *
 * Para el módulo de Viajes se usa una única capacidad: leer un formulario de
 * extractora (imagen o PDF) y extraer hasta 10 campos. Solo 3 son críticos
 * (peso_viaje, fecha_llegada, hora_llegada); el resto son opcionales — Claude
 * debe devolver null cuando no los vea, sin alucinar valores.
 *
 * No se agrega el SDK oficial de Anthropic para mantener dependencias al
 * mínimo — un solo endpoint (POST /v1/messages) no amerita un paquete extra.
 */
class ClaudeVisionService
{
    private const ENDPOINT    = 'https://api.anthropic.com/v1/messages';
    private const API_VERSION = '2023-06-01';
    private const MAX_TOKENS  = 600;

    /**
     * Campos que el Job exige presentes para considerar el OCR exitoso. Si
     * Claude no los lee, el documento va a REVISION_MANUAL aunque la confianza
     * reportada sea alta.
     */
    public const CAMPOS_CRITICOS = ['peso_viaje', 'fecha_llegada', 'hora_llegada'];

    public const CALIDADES_VALIDAS = ['excelente', 'buena', 'regular', 'deficiente'];

    /**
     * System prompt con `cache_control: ephemeral` para aprovechar prompt
     * caching de Anthropic (~5 min de TTL; reduce costo ~90% tras el primer hit).
     */
    private const SYSTEM_PROMPT = <<<PROMPT
Eres un extractor de datos de formularios de extractora de aceite de palma africana en Colombia. Lees el documento adjunto (foto o PDF) y devuelves un JSON con los campos del formulario.

Hay TRES campos CRÍTICOS que casi siempre aparecen y que debes esforzarte por leer:
1. peso_viaje (kilogramos): el peso del fruto recibido. Etiquetas comunes: "Peso Neto", "Neto", "Peso Carga", "Carga Neta". Si solo hay "Peso Bruto" y "Tara", calcula Neto = Bruto - Tara. Si solo hay "Peso Bruto" sin tara reportada, devuelve el bruto y menciona en observaciones_extractora que es bruto. Si las unidades son toneladas (t, ton), multiplica por 1000.
2. fecha_llegada (YYYY-MM-DD): fecha en que el camión llegó a la extractora. Etiquetas: "Fecha", "Fecha Llegada", "Fecha Recepción".
3. hora_llegada (HH:MM, 24h): hora de llegada. Etiquetas: "Hora", "Hora Llegada", "Hora Recepción".

Hay SIETE campos OPCIONALES que muchos formularios NO incluyen. Es completamente normal que falten — devuelve null sin penalizar la confianza por esto:
- numero_remision_extractora (string ≤ 50 chars): número interno que asigna la extractora. Etiquetas: "Remisión", "N° Remisión", "Recibo", "N° Doc", "Tiquete".
- racimos_recibidos (entero): cantidad de racimos contados al recibir. Etiquetas: "Racimos", "Gajos", "Cantidad Racimos".
- temperatura_pulpa (número, °C): "Temperatura", "Temp Pulpa", "T°".
- acidez_inicial (número, %): "Acidez", "% Acidez", "AGL", "% AGL".
- humedad_semilla (número, %): "Humedad", "% Humedad Almendra", "% H. Semilla".
- calidad_materia_prima: clasificación cualitativa. SOLO acepta uno de estos valores exactos: "excelente", "buena", "regular", "deficiente". Si el documento usa otra escala (ej. A/B/C, números, etc.) o no aparece, devuelve null.
- observaciones_extractora (string ≤ 500 chars): notas del receptor. También úsalo para mencionar si el peso es bruto sin tara, si la unidad fue toneladas convertida, etc.

Reglas estrictas:
- NUNCA inventes valores. Si no ves un dato, devuelve null para ese campo.
- Si el documento está en blanco, ilegible, o claramente no es un formulario de extractora, devuelve null en TODOS los campos y confianza 0.0.
- La confianza global (0.0-1.0) debe reflejar (a) la nitidez/legibilidad del documento y (b) si los 3 críticos pudieron leerse. Si falta cualquier crítico, la confianza no debe superar 0.5.
- No incluyas backticks, code fences, ni texto fuera del JSON.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con este shape exacto:

{"peso_viaje": <number|null>, "numero_remision_extractora": <string|null>, "fecha_llegada": <"YYYY-MM-DD"|null>, "hora_llegada": <"HH:MM"|null>, "racimos_recibidos": <int|null>, "temperatura_pulpa": <number|null>, "acidez_inicial": <number|null>, "humedad_semilla": <number|null>, "calidad_materia_prima": <"excelente"|"buena"|"regular"|"deficiente"|null>, "observaciones_extractora": <string|null>, "confianza": <number entre 0.0 y 1.0>}
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
     * Normaliza los 10 campos extraídos: tipos correctos, recortes a max length,
     * enums válidos. Garantiza que las 10 keys existan (con null si Claude no las
     * devolvió) para que el Job pueda iterarlas sin defenderse de keys ausentes.
     */
    private function normalizarDatos(array $parsed): array
    {
        $calidad = $parsed['calidad_materia_prima'] ?? null;
        if (is_string($calidad)) {
            $calidad = strtolower(trim($calidad));
            if (!in_array($calidad, self::CALIDADES_VALIDAS, true)) {
                $calidad = null;
            }
        } else {
            $calidad = null;
        }

        return [
            'peso_viaje'                 => $this->aFloatONull($parsed['peso_viaje'] ?? null),
            'numero_remision_extractora' => $this->aStringRecortado($parsed['numero_remision_extractora'] ?? null, 50),
            'fecha_llegada'              => $this->aFechaONull($parsed['fecha_llegada'] ?? null),
            'hora_llegada'               => $this->aHoraONull($parsed['hora_llegada'] ?? null),
            'racimos_recibidos'          => $this->aIntONull($parsed['racimos_recibidos'] ?? null),
            'temperatura_pulpa'          => $this->aFloatONull($parsed['temperatura_pulpa'] ?? null),
            'acidez_inicial'             => $this->aFloatONull($parsed['acidez_inicial'] ?? null),
            'humedad_semilla'            => $this->aFloatONull($parsed['humedad_semilla'] ?? null),
            'calidad_materia_prima'      => $calidad,
            'observaciones_extractora'   => $this->aStringRecortado($parsed['observaciones_extractora'] ?? null, 500),
        ];
    }

    private function aFloatONull(mixed $v): ?float
    {
        if ($v === null || $v === '') {
            return null;
        }
        return is_numeric($v) ? (float) $v : null;
    }

    private function aIntONull(mixed $v): ?int
    {
        if ($v === null || $v === '') {
            return null;
        }
        return is_numeric($v) ? (int) $v : null;
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
