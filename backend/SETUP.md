# AGRO CAMPO — Guía de Instalación

## Requisitos
- PHP 8.4+ | Composer 2.x | PostgreSQL 16+ | Node.js 20+ | Laragon

---

## Paso 1: Crear Proyecto

```bash
cd C:\laragon\www
composer create-project laravel/laravel agro-campo "^12.0"
cd agro-campo
```

## Paso 2: Instalar Dependencias

```bash
composer require php-open-source-saver/jwt-auth
composer require spatie/laravel-permission
composer require laravel/pulse
composer require laravel/telescope --dev
composer require barryvdh/laravel-ide-helper --dev
```

## Paso 3: Publicar Configuraciones

```bash
php artisan vendor:publish --provider="PHPOpenSourceSaver\JWTAuth\Providers\LaravelServiceProvider"
php artisan jwt:secret
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
php artisan vendor:publish --provider="Laravel\Pulse\PulseServiceProvider"
php artisan vendor:publish --provider="Laravel\Telescope\TelescopeServiceProvider"
```

## Paso 4: Configurar `.env`

```env
APP_NAME="Agro Campo"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://agro-campo.test

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=agro_campo
DB_USERNAME=postgres
DB_PASSWORD=tu_password

QUEUE_CONNECTION=database

JWT_SECRET=
JWT_TTL=60
JWT_REFRESH_TTL=20160
```

## Paso 5: Crear BD

```sql
CREATE DATABASE agro_campo;
```

## Paso 6: Configurar Spatie Permission

En `config/permission.php`:
```php
'teams' => true,
'team_foreign_key' => 'tenant_id',
```

## Paso 7: Copiar Archivos del ZIP

Copiar las carpetas `app/`, `bootstrap/`, `config/`, `database/`, `routes/`
del ZIP a `C:\laragon\www\agro-campo\` (reemplazar archivos existentes).

## Paso 8: Migrar y Seedear

```bash
php artisan migrate
php artisan db:seed
```

## Paso 9: Verificar

```bash
php artisan route:list --path=api
```

Dashboard Pulse: http://agro-campo.test/pulse (solo super_admin)

## Paso 10: Test

```bash
curl -X POST http://agro-campo.test/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@agrocampo.com\",\"password\":\"admin1234\"}"
```
