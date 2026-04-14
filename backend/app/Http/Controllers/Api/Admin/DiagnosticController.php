<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class DiagnosticController extends Controller
{
    /**
     * GET /api/v1/admin/diagnostics
     * Información de diagnóstico del sistema para super admin.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'servidor'    => $this->serverInfo(),
                'php'         => $this->phpInfo(),
                'base_datos'  => $this->databaseInfo(),
                'disco'       => $this->diskInfo(),
                'cache'       => $this->cacheInfo(),
                'aplicacion'  => $this->appInfo(),
            ],
        ]);
    }

    private function serverInfo(): array
    {
        return [
            'hostname'          => gethostname(),
            'sistema_operativo' => PHP_OS_FAMILY . ' (' . PHP_OS . ')',
            'arquitectura'      => php_uname('m'),
            'servidor_web'      => $_SERVER['SERVER_SOFTWARE'] ?? 'N/A',
            'ip_servidor'       => $_SERVER['SERVER_ADDR'] ?? request()->server('SERVER_ADDR', 'N/A'),
            'tiempo_actividad'  => $this->getUptime(),
        ];
    }

    private function phpInfo(): array
    {
        return [
            'version'              => PHP_VERSION,
            'sapi'                 => PHP_SAPI,
            'memoria_limite'       => ini_get('memory_limit'),
            'memoria_uso_actual'   => $this->formatBytes(memory_get_usage(true)),
            'memoria_pico'         => $this->formatBytes(memory_get_peak_usage(true)),
            'max_execution_time'   => ini_get('max_execution_time') . 's',
            'upload_max_filesize'  => ini_get('upload_max_filesize'),
            'post_max_size'        => ini_get('post_max_size'),
            'extensiones_cargadas' => count(get_loaded_extensions()),
            'opcache_habilitado'   => function_exists('opcache_get_status') && !empty(opcache_get_status(false)),
        ];
    }

    private function databaseInfo(): array
    {
        $connection = config('database.default');
        $info = [
            'driver'   => $connection,
            'database' => config("database.connections.{$connection}.database"),
        ];

        try {
            $info['conexion'] = 'OK';

            match ($connection) {
                'mysql', 'mariadb' => $this->mysqlInfo($info),
                'pgsql'           => $this->pgsqlInfo($info),
                'sqlite'          => $this->sqliteInfo($info),
                default           => null,
            };
        } catch (\Throwable $e) {
            $info['conexion'] = 'ERROR';
            $info['error'] = $e->getMessage();
        }

        return $info;
    }

    private function mysqlInfo(array &$info): void
    {
        $info['version'] = DB::selectOne('SELECT VERSION() as v')->v;

        $sizeQuery = DB::selectOne(
            "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
             FROM information_schema.tables
             WHERE table_schema = ?",
            [config('database.connections.mysql.database') ?? config('database.connections.mariadb.database')]
        );
        $info['peso_mb'] = ($sizeQuery->size_mb ?? 0) . ' MB';

        $tables = DB::selectOne(
            "SELECT COUNT(*) as total
             FROM information_schema.tables
             WHERE table_schema = ?",
            [config('database.connections.mysql.database') ?? config('database.connections.mariadb.database')]
        );
        $info['tablas'] = $tables->total ?? 0;

        $status = DB::select('SHOW GLOBAL STATUS WHERE Variable_name IN ("Uptime", "Threads_connected", "Queries")');
        foreach ($status as $row) {
            match ($row->Variable_name) {
                'Uptime'           => $info['uptime_db'] = gmdate('H:i:s', (int) $row->Value),
                'Threads_connected' => $info['conexiones_activas'] = (int) $row->Value,
                'Queries'          => $info['queries_totales'] = number_format((int) $row->Value),
                default            => null,
            };
        }
    }

    private function pgsqlInfo(array &$info): void
    {
        $info['version'] = DB::selectOne('SELECT version() as v')->v;

        $sizeQuery = DB::selectOne(
            "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
        );
        $info['peso'] = $sizeQuery->size ?? 'N/A';

        $tables = DB::selectOne(
            "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = 'public'"
        );
        $info['tablas'] = $tables->total ?? 0;

        $connections = DB::selectOne("SELECT count(*) as total FROM pg_stat_activity");
        $info['conexiones_activas'] = $connections->total ?? 0;
    }

    private function sqliteInfo(array &$info): void
    {
        $info['version'] = DB::selectOne('SELECT sqlite_version() as v')->v;

        $dbPath = config('database.connections.sqlite.database');
        if ($dbPath && file_exists($dbPath)) {
            $info['peso'] = $this->formatBytes(filesize($dbPath));
        }

        $tables = DB::selectOne("SELECT COUNT(*) as total FROM sqlite_master WHERE type='table'");
        $info['tablas'] = $tables->total ?? 0;
    }

    private function diskInfo(): array
    {
        $path = base_path();
        $free = disk_free_space($path);
        $total = disk_total_space($path);
        $used = $total - $free;

        return [
            'total'          => $this->formatBytes($total),
            'usado'          => $this->formatBytes($used),
            'libre'          => $this->formatBytes($free),
            'uso_porcentaje' => round(($used / $total) * 100, 2) . '%',
            'storage_app'    => $this->formatBytes($this->directorySize(storage_path('app'))),
            'storage_logs'   => $this->formatBytes($this->directorySize(storage_path('logs'))),
        ];
    }

    private function cacheInfo(): array
    {
        $driver = config('cache.default');
        $info = ['driver' => $driver];

        try {
            $key = 'diagnostic_cache_test_' . time();
            Cache::put($key, true, 10);
            $info['estado'] = Cache::get($key) ? 'OK' : 'ERROR';
            Cache::forget($key);
        } catch (\Throwable) {
            $info['estado'] = 'ERROR';
        }

        return $info;
    }

    private function appInfo(): array
    {
        return [
            'nombre'      => config('app.name'),
            'entorno'     => config('app.env'),
            'debug'       => config('app.debug'),
            'url'         => config('app.url'),
            'timezone'    => config('app.timezone'),
            'locale'      => config('app.locale'),
            'laravel'     => app()->version(),
            'queue_driver' => config('queue.default'),
        ];
    }

    private function getUptime(): string
    {
        if (PHP_OS_FAMILY === 'Linux') {
            $uptime = @file_get_contents('/proc/uptime');
            if ($uptime) {
                $seconds = (int) explode(' ', $uptime)[0];
                return sprintf('%dd %dh %dm', $seconds / 86400, ($seconds % 86400) / 3600, ($seconds % 3600) / 60);
            }
        }

        return 'N/A';
    }

    private function directorySize(string $path): int
    {
        $size = 0;
        if (!is_dir($path)) {
            return $size;
        }

        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS)) as $file) {
            $size += $file->getSize();
        }

        return $size;
    }

    private function formatBytes(int|float $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = $bytes > 0 ? floor(log($bytes, 1024)) : 0;
        $pow = min($pow, count($units) - 1);

        return round($bytes / (1024 ** $pow), $precision) . ' ' . $units[$pow];
    }
}
