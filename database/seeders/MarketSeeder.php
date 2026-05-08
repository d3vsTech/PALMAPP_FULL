<?php

namespace Database\Seeders;

use App\Models\Market\MarketCarrito;
use App\Models\Market\MarketCarritoItem;
use App\Models\Market\MarketCategoria;
use App\Models\Market\MarketPedido;
use App\Models\Market\MarketPedidoEstadoHistorial;
use App\Models\Market\MarketPedidoItem;
use App\Models\Market\MarketPrecioVolumen;
use App\Models\Market\MarketProducto;
use App\Models\Market\MarketProveedor;
use App\Models\Market\MarketProveedorUser;
use App\Models\Market\MarketUnidadMedida;
use App\Models\Tenant;
use App\Models\TenantConfig;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MarketSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. PROVEEDOR POR DEFECTO ──────────────────────────────────────────
        $proveedor = MarketProveedor::create([
            'nombre_empresa'        => 'AgroInsumos del Valle',
            'nit'                   => '900123456-7',
            'telefono'              => '3157890123',
            'email'                 => 'ventas@agroinsumosdelvalle.com',
            'direccion'             => 'Calle 15 #23-45, Zona Industrial',
            'ciudad'                => 'Villavicencio',
            'departamento'          => 'Meta',
            'descripcion'           => 'Proveedor líder de insumos agrícolas para palma de aceite en los Llanos Orientales. Más de 15 años de experiencia.',
            'estado'                => 'activo',
            'calificacion_promedio' => 4.7,
            'total_ventas'          => 1250,
        ]);

        // ── 2. USUARIO ADMIN DEL PROVEEDOR ───────────────────────────────────
        $userProveedor = User::create([
            'name'              => 'Admin AgroInsumos',
            'email'             => 'admin@agroinsumosdelvalle.com',
            'password'          => Hash::make('password'),
            'is_super_admin'    => false,
            'status'            => true,
            'email_verified_at' => now(),
        ]);

        MarketProveedorUser::create([
            'proveedor_id' => $proveedor->id,
            'user_id'      => $userProveedor->id,
            'rol'          => 'ADMIN',
            'estado'       => true,
        ]);

        // ── 3. CATEGORÍAS ─────────────────────────────────────────────────────
        $categorias = [
            ['nombre' => 'Fertilizantes',  'slug' => 'fertilizantes',  'icono' => 'sprout',    'orden' => 1],
            ['nombre' => 'Agroquímicos',   'slug' => 'agroquimicos',   'icono' => 'droplet',   'orden' => 2],
            ['nombre' => 'Herramientas',   'slug' => 'herramientas',   'icono' => 'wrench',    'orden' => 3],
            ['nombre' => 'Maquinaria',     'slug' => 'maquinaria',     'icono' => 'settings',  'orden' => 4],
            ['nombre' => 'Semillas',       'slug' => 'semillas',       'icono' => 'leaf',      'orden' => 5],
        ];

        $cats = [];
        foreach ($categorias as $data) {
            $cats[$data['slug']] = MarketCategoria::create($data + ['activa' => true]);
        }

        // ── 4. UNIDADES DE MEDIDA ─────────────────────────────────────────────
        $unidades = [
            ['codigo' => 'BLT', 'nombre' => 'bulto',      'abreviatura' => 'bulto'],
            ['codigo' => 'LT',  'nombre' => 'litro',      'abreviatura' => 'lt'],
            ['codigo' => 'UND', 'nombre' => 'unidad',     'abreviatura' => 'und'],
            ['codigo' => 'KG',  'nombre' => 'kilogramo',  'abreviatura' => 'kg'],
            ['codigo' => 'GAL', 'nombre' => 'galón',      'abreviatura' => 'gal'],
        ];

        $unds = [];
        foreach ($unidades as $data) {
            $unds[$data['codigo']] = MarketUnidadMedida::create($data + ['activa' => true]);
        }

        // ── 5. PRODUCTOS ──────────────────────────────────────────────────────
        $productos = [
            [
                'nombre'          => 'Fertilizante NPK 15-15-15',
                'descripcion'     => 'Fertilizante completo para palma de aceite. Fórmula balanceada que estimula crecimiento vegetativo, floración y fructificación.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 95000,
                'stock_disponible'=> 250,
                'stock_minimo'    => 20,
                'destacado'       => true,
                'calificacion_promedio' => 4.5,
                'total_reseñas'   => 128,
                'especificaciones'=> [
                    'composicion'  => 'Nitrógeno 15%, Fósforo 15%, Potasio 15%',
                    'presentacion' => 'Bulto de 50 kg',
                    'forma_fisica' => 'Granulado',
                    'registro_ica' => 'ICA-2024-12345',
                    'vida_util'    => '24 meses',
                    'almacenamiento' => 'Lugar fresco y seco',
                ],
                'precios_volumen' => [
                    ['cantidad_minima' => 10,  'precio_unidad' => 92000],
                    ['cantidad_minima' => 50,  'precio_unidad' => 89000],
                    ['cantidad_minima' => 100, 'precio_unidad' => 85000],
                ],
            ],
            [
                'nombre'          => 'Glifosato 48% SL',
                'descripcion'     => 'Herbicida sistémico no selectivo. Control efectivo de malezas en cultivos de palma de aceite.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 42000,
                'stock_disponible'=> 150,
                'stock_minimo'    => 15,
                'destacado'       => true,
                'calificacion_promedio' => 4.2,
                'total_reseñas'   => 94,
                'especificaciones'=> [
                    'ingrediente_activo' => 'Glifosato 48%',
                    'formulacion'        => 'Solución Líquida (SL)',
                    'registro_ica'       => 'ICA-2023-98765',
                    'vida_util'          => '24 meses',
                    'dosis_recomendada'  => '2-4 lt/ha',
                ],
                'precios_volumen' => [
                    ['cantidad_minima' => 20,  'precio_unidad' => 40000],
                    ['cantidad_minima' => 50,  'precio_unidad' => 38000],
                ],
            ],
            [
                'nombre'          => 'Machete Palero 24"',
                'descripcion'     => 'Machete profesional para cosecha de palma de aceite. Hoja de acero inoxidable con filo sostenido.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 35000,
                'stock_disponible'=> 80,
                'stock_minimo'    => 10,
                'destacado'       => false,
                'calificacion_promedio' => 4.8,
                'total_reseñas'   => 63,
                'especificaciones'=> [
                    'longitud'    => '24 pulgadas',
                    'material'    => 'Acero inoxidable templado',
                    'mango'       => 'Plástico ergonómico antideslizante',
                    'peso'        => '0.8 kg',
                ],
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 33000],
                    ['cantidad_minima' => 50, 'precio_unidad' => 30000],
                ],
            ],
            [
                'nombre'          => 'Urea 46%',
                'descripcion'     => 'Fertilizante nitrogenado de alta concentración. Ideal para estimular el crecimiento vegetativo de la palma.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 88000,
                'stock_disponible'=> 200,
                'stock_minimo'    => 15,
                'destacado'       => true,
                'calificacion_promedio' => 4.6,
                'total_reseñas'   => 87,
                'especificaciones'=> [
                    'composicion'  => 'Nitrógeno total 46%',
                    'presentacion' => 'Bulto de 50 kg',
                    'forma_fisica' => 'Perlado',
                    'registro_ica' => 'ICA-2024-11111',
                    'vida_util'    => '18 meses',
                    'almacenamiento' => 'Lugar seco, alejado de humedad',
                ],
                'precios_volumen' => [
                    ['cantidad_minima' => 10,  'precio_unidad' => 85000],
                    ['cantidad_minima' => 50,  'precio_unidad' => 82000],
                    ['cantidad_minima' => 100, 'precio_unidad' => 78000],
                ],
            ],
            [
                'nombre'          => 'Herbicida Selectivo',
                'descripcion'     => 'Herbicida selectivo postemergente para control de gramíneas en palma de aceite.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 38000,
                'stock_disponible'=> 8,
                'stock_minimo'    => 10,
                'destacado'       => false,
                'calificacion_promedio' => 4.1,
                'total_reseñas'   => 42,
                'especificaciones'=> [
                    'ingrediente_activo' => 'Fluazifop-butil 12.5%',
                    'formulacion'        => 'Concentrado Emulsionable (EC)',
                    'registro_ica'       => 'ICA-2022-55432',
                    'vida_util'          => '24 meses',
                ],
                'precios_volumen' => [],
            ],
            [
                'nombre'          => 'Insecticida Orgánico',
                'descripcion'     => 'Insecticida de origen biológico para control de plagas en palma. Compatible con manejo integrado.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 54000,
                'stock_disponible'=> 120,
                'stock_minimo'    => 12,
                'destacado'       => false,
                'calificacion_promedio' => 4.3,
                'total_reseñas'   => 35,
                'especificaciones'=> [
                    'ingrediente_activo' => 'Bacillus thuringiensis',
                    'formulacion'        => 'Concentrado Soluble (SL)',
                    'registro_ica'       => 'ICA-2023-77890',
                    'vida_util'          => '12 meses',
                    'almacenamiento'     => 'Refrigerar entre 2-8°C',
                ],
                'precios_volumen' => [
                    ['cantidad_minima' => 20, 'precio_unidad' => 51000],
                ],
            ],
        ];

        $productoModels = [];
        foreach ($productos as $data) {
            $preciosVolumen = $data['precios_volumen'];
            unset($data['precios_volumen']);

            $categoriaSlug = $data['categoria_slug'];
            $unidadCodigo  = $data['unidad_codigo'];
            unset($data['categoria_slug'], $data['unidad_codigo']);

            $producto = MarketProducto::create(array_merge($data, [
                'proveedor_id'    => $proveedor->id,
                'categoria_id'    => $cats[$categoriaSlug]->id,
                'unidad_medida_id'=> $unds[$unidadCodigo]->id,
            ]));

            foreach ($preciosVolumen as $pv) {
                MarketPrecioVolumen::create(array_merge($pv, [
                    'producto_id' => $producto->id,
                    'activo'      => true,
                ]));
            }

            $productoModels[$producto->nombre] = $producto;
        }

        // ── 6. ACTIVAR MÓDULO MARKET EN TENANT DEMO ───────────────────────────
        $tenantDemo = Tenant::where('nombre', 'Finca La Esperanza')->first();

        if ($tenantDemo) {
            TenantConfig::where('tenant_id', $tenantDemo->id)
                ->update(['modulo_market' => true]);

            // ── 7. PEDIDOS DEMO ───────────────────────────────────────────────
            $npk        = $productoModels['Fertilizante NPK 15-15-15'];
            $glifosato  = $productoModels['Glifosato 48% SL'];
            $herbicida  = $productoModels['Herbicida Selectivo'];
            $direccion  = "{$tenantDemo->direccion}, {$tenantDemo->municipio}, {$tenantDemo->departamento}";

            // PED-001: En tránsito (10x NPK + 5x Glifosato)
            $ped1 = MarketPedido::create([
                'codigo'                 => 'PED-001',
                'tenant_id'              => $tenantDemo->id,
                'proveedor_id'           => $proveedor->id,
                'estado'                 => 'en_transito',
                'subtotal'               => 1160000,
                'costo_envio'            => 25000,
                'total'                  => 1185000,
                'metodo_pago'            => 'Transferencia Bancaria',
                'direccion_entrega'      => $direccion,
                'fecha_pedido'           => now()->subDays(28),
                'fecha_entrega_estimada' => now()->subDays(24),
            ]);

            MarketPedidoItem::create([
                'pedido_id'       => $ped1->id,
                'producto_id'     => $npk->id,
                'cantidad'        => 10,
                'precio_unitario' => 95000,
                'subtotal'        => 950000,
                'nombre_producto' => $npk->nombre,
            ]);
            MarketPedidoItem::create([
                'pedido_id'       => $ped1->id,
                'producto_id'     => $glifosato->id,
                'cantidad'        => 5,
                'precio_unitario' => 42000,
                'subtotal'        => 210000,
                'nombre_producto' => $glifosato->nombre,
            ]);

            $this->registrarHistorial($ped1->id, null, 'pendiente', 'Pedido recibido');
            $this->registrarHistorial($ped1->id, 'pendiente', 'confirmado', 'Pedido confirmado por el proveedor');
            $this->registrarHistorial($ped1->id, 'confirmado', 'preparando', 'Preparando tu pedido');
            $this->registrarHistorial($ped1->id, 'preparando', 'en_transito', 'En camino a tu dirección');

            // PED-002: Entregado (8x Herbicida Selectivo)
            $ped2 = MarketPedido::create([
                'codigo'                 => 'PED-002',
                'tenant_id'              => $tenantDemo->id,
                'proveedor_id'           => $proveedor->id,
                'estado'                 => 'entregado',
                'subtotal'               => 304000,
                'costo_envio'            => 0,
                'total'                  => 304000,
                'metodo_pago'            => 'Transferencia Bancaria',
                'direccion_entrega'      => $direccion,
                'fecha_pedido'           => now()->subDays(31),
                'fecha_entrega_estimada' => now()->subDays(27),
                'fecha_entrega_real'     => now()->subDays(26),
            ]);

            MarketPedidoItem::create([
                'pedido_id'       => $ped2->id,
                'producto_id'     => $herbicida->id,
                'cantidad'        => 8,
                'precio_unitario' => 38000,
                'subtotal'        => 304000,
                'nombre_producto' => $herbicida->nombre,
            ]);

            $this->registrarHistorial($ped2->id, null, 'pendiente', 'Pedido recibido');
            $this->registrarHistorial($ped2->id, 'pendiente', 'confirmado', 'Pedido confirmado');
            $this->registrarHistorial($ped2->id, 'confirmado', 'preparando', 'En alistamiento');
            $this->registrarHistorial($ped2->id, 'preparando', 'en_transito', 'Despachado');
            $this->registrarHistorial($ped2->id, 'en_transito', 'entregado', 'Entregado en finca');

            // PED-003: Confirmado (50x NPK)
            $ped3 = MarketPedido::create([
                'codigo'                 => 'PED-003',
                'tenant_id'              => $tenantDemo->id,
                'proveedor_id'           => $proveedor->id,
                'estado'                 => 'confirmado',
                'subtotal'               => 4450000,
                'costo_envio'            => 0,
                'total'                  => 4450000,
                'metodo_pago'            => 'Crédito 30 días',
                'direccion_entrega'      => $direccion,
                'fecha_pedido'           => now()->subDays(3),
                'fecha_entrega_estimada' => now()->addDays(4),
            ]);

            MarketPedidoItem::create([
                'pedido_id'       => $ped3->id,
                'producto_id'     => $npk->id,
                'cantidad'        => 50,
                'precio_unitario' => 89000,
                'subtotal'        => 4450000,
                'descuento'       => 300000,
                'nombre_producto' => $npk->nombre,
            ]);

            $this->registrarHistorial($ped3->id, null, 'pendiente', 'Pedido recibido');
            $this->registrarHistorial($ped3->id, 'pendiente', 'confirmado', 'Pedido confirmado por el proveedor');

            // ── 8. CARRITO DEMO (con 2 productos en el carrito actual) ─────────
            $carrito = MarketCarrito::create(['tenant_id' => $tenantDemo->id]);

            MarketCarritoItem::create([
                'carrito_id'  => $carrito->id,
                'producto_id' => $npk->id,
                'cantidad'    => 10,
            ]);
            MarketCarritoItem::create([
                'carrito_id'  => $carrito->id,
                'producto_id' => $glifosato->id,
                'cantidad'    => 5,
            ]);
        }

        $this->command->info('');
        $this->command->info('──────────────────────────────────────────');
        $this->command->info(' MARKET — Seeder ejecutado');
        $this->command->info('──────────────────────────────────────────');
        $this->command->info(" Proveedor: AgroInsumos del Valle");
        $this->command->info(" Admin proveedor: admin@agroinsumosdelvalle.com / password");
        $this->command->info(" Categorías: " . count($categorias));
        $this->command->info(" Productos: " . count($productos));
        $this->command->info(" Pedidos demo: 3 (tenant Finca La Esperanza)");
        $this->command->info('──────────────────────────────────────────');
    }

    private function registrarHistorial(int $pedidoId, ?string $anterior, string $nuevo, string $comentario): void
    {
        MarketPedidoEstadoHistorial::create([
            'pedido_id'       => $pedidoId,
            'estado_anterior' => $anterior,
            'estado_nuevo'    => $nuevo,
            'comentario'      => $comentario,
        ]);
    }
}
