<?php

namespace Database\Seeders;

use App\Models\Market\MarketCategoria;
use App\Models\Market\MarketPedidoEstadoHistorial;
use App\Models\Market\MarketPrecioVolumen;
use App\Models\Market\MarketProducto;
use App\Models\Market\MarketProductoImagen;
use App\Models\Market\MarketProveedor;
use App\Models\Market\MarketProveedorUser;
use App\Models\Market\MarketUnidadMedida;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MarketSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. PROVEEDOR POR DEFECTO ──────────────────────────────────────────
        $proveedor = MarketProveedor::firstOrCreate(
            ['nit' => '900123456-7'],
            [
                'nombre_empresa'        => 'AgroInsumos del Valle',
                'telefono'              => '3157890123',
                'email'                 => 'ventas@agroinsumosdelvalle.com',
                'direccion'             => 'Calle 15 #23-45, Zona Industrial',
                'ciudad'                => 'Villavicencio',
                'departamento'          => 'Meta',
                'descripcion'           => 'Proveedor líder de insumos agrícolas para palma de aceite en los Llanos Orientales. Más de 15 años de experiencia.',
                'estado'                => 'activo',
                'calificacion_promedio' => 4.7,
                'total_ventas'          => 1250,
            ]
        );

        // ── 2. USUARIO ADMIN DEL PROVEEDOR ───────────────────────────────────
        $userProveedor = User::firstOrCreate(
            ['email' => 'admin@agroinsumosdelvalle.com'],
            [
                'name'              => 'Admin AgroInsumos',
                'password'          => Hash::make('password'),
                'is_super_admin'    => false,
                'status'            => true,
                'email_verified_at' => now(),
            ]
        );

        MarketProveedorUser::firstOrCreate(
            ['proveedor_id' => $proveedor->id, 'user_id' => $userProveedor->id],
            ['rol' => 'ADMIN', 'estado' => true]
        );

        // ── 3. CATEGORÍAS ─────────────────────────────────────────────────────
        $categorias = [
            ['nombre' => 'Fertilizantes', 'slug' => 'fertilizantes', 'icono' => 'sprout',   'orden' => 1],
            ['nombre' => 'Agroquímicos',  'slug' => 'agroquimicos',  'icono' => 'droplet',  'orden' => 2],
            ['nombre' => 'Herramientas',  'slug' => 'herramientas',  'icono' => 'wrench',   'orden' => 3],
            ['nombre' => 'Maquinaria',    'slug' => 'maquinaria',    'icono' => 'settings', 'orden' => 4],
            ['nombre' => 'Insumos',       'slug' => 'insumos',       'icono' => 'package',  'orden' => 5],
            ['nombre' => 'Equipos',       'slug' => 'equipos',       'icono' => 'shield',   'orden' => 6],
        ];

        $cats = [];
        foreach ($categorias as $data) {
            $cats[$data['slug']] = MarketCategoria::firstOrCreate(
                ['slug' => $data['slug']],
                array_merge($data, ['activa' => true])
            );
        }

        // ── 4. UNIDADES DE MEDIDA ─────────────────────────────────────────────
        $unidades = [
            ['codigo' => 'BLT', 'nombre' => 'bulto',     'abreviatura' => 'bulto'],
            ['codigo' => 'LT',  'nombre' => 'litro',     'abreviatura' => 'lt'],
            ['codigo' => 'UND', 'nombre' => 'unidad',    'abreviatura' => 'und'],
            ['codigo' => 'KG',  'nombre' => 'kilogramo', 'abreviatura' => 'kg'],
            ['codigo' => 'GAL', 'nombre' => 'galón',     'abreviatura' => 'gal'],
            ['codigo' => 'KIT', 'nombre' => 'kit',       'abreviatura' => 'kit'],
        ];

        $unds = [];
        foreach ($unidades as $data) {
            $unds[$data['codigo']] = MarketUnidadMedida::firstOrCreate(
                ['codigo' => $data['codigo']],
                array_merge($data, ['activa' => true])
            );
        }

        // ── 5. PRODUCTOS (50) ─────────────────────────────────────────────────
        // Cada entrada: sku, nombre, descripcion, categoria_slug, unidad_codigo,
        //               precio_unitario, stock_disponible, stock_minimo, destacado,
        //               precios_volumen[]
        $productos = [

            // ── AGROQUÍMICOS ──────────────────────────────────────────────────
            [
                'sku'             => 'AGRO-001',
                'nombre'          => 'HERBICIDA GLIFOSATO CREDIT 480',
                'descripcion'     => 'Glifosato Credit es un herbicida de amplio espectro diseñado para el control efectivo de malezas en cultivos y áreas de mantenimiento, como vías, vías ferroviarias, estaciones o plantas de energía eléctrica, etc. Su fórmula actúa sobre todo tipo de malezas, permitiendo proteger tus cultivos y optimizar el rendimiento de tus terrenos. Ideal para agricultores que buscan soluciones prácticas y confiables en el manejo de malezas. Aplicación versátil en diferentes tipos de cultivos y condiciones. Confía en un producto que respalda el crecimiento de tu operación agrícola.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'GAL',
                'precio_unitario' => 15990.00,
                'stock_disponible'=> 800,
                'stock_minimo'    => 40,
                'destacado'       => true,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 91000.00],
                    ['cantidad_minima' => 24, 'precio_unidad' => 87000.00],
                    ['cantidad_minima' => 60, 'precio_unidad' => 83000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-002',
                'nombre'          => 'HERBICIDA GLUFOSINATO DE AMONIO DESTIERRO 200 SL',
                'descripcion'     => 'EL HERBICIDA GLUFOSINATO DE AMONIO DESTIERRO 200 SL tiene como ingrediente activo glufosinato en forma de sal de amonio en una concentración de 200 g/l. DESTIERRO 200 SL es un herbicida, líquido, concentrado soluble, no selectivo, de aplicación en post emergencia y de acción de contacto, con sistema limitada sobre las hojas. Herbicida no selectivo, inhibidor de la glutamina sintetasa. Lleva a la acumulación de iones amonio e inhibe la fotosíntesis. Es un herbicida de contacto con alguna acción sistémica; la traslocación ocurre solamente dentro de las hojas.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 24100.00,
                'stock_disponible'=> 400,
                'stock_minimo'    => 20,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 75000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 72000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-003',
                'nombre'          => 'PROFENOFOS+CIPERMETRINA FULMINATOR 600 SC',
                'descripcion'     => 'FULMINATOR 600 SC es un insecticida químico que actúa por contacto e ingestión, además tiene efecto traslaminar. MECANISMO DE ACCIÓN: PROFENOFOS inhibe la formación de acetilcolinesterasa alterando las funciones del sistema nervioso central del insecto. CIPERMETRINA genera desbalance electroquímico en las neuronas del insecto, provocando parálisis y muerte. Composición: Profenofos 500 g/litro + Cipermetrina 100 g/litro. Grupo químico: Organofosforado + Piretroide.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 84850.00,
                'stock_disponible'=> 600,
                'stock_minimo'    => 30,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 52000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 49000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-004',
                'nombre'          => 'INSECTICIDA BETA-CYFLUTHRIN + IMIDACLOPRID CONNECT DUO OD300',
                'descripcion'     => 'Insecticida Beta-cyfluthrin + Imidacloprid CONNECT DUO OD300 es una poderosa combinación insecticida de doble acción: contacto y sistémico. Cuenta con la tecnología O-TEQ patentada que brinda un efecto hasta siete (7) veces más rápido en la absorción del ingrediente activo al interior de la planta. Garantiza un rápido control de plagas masticadoras y chupadoras en cultivos de Papa, Arroz, Tomate, Cítricos, Maíz, cebolla, ornamentales, frijol, arveja, plátano y zanahoria. Imidacloprid: 210 g/L de formulación, Beta-cyfluthrin: 90 g/L de formulación.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 250000.00,
                'stock_disponible'=> 250,
                'stock_minimo'    => 12,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 105000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 100000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-005',
                'nombre'          => 'FUNGICIDA QUÍMICO MANCOZEB INVEZEB 80 WP',
                'descripcion'     => 'FUNGICIDA QUÍMICO INVEZEB 80 WP, con actividad preventiva, cuya acción en varios sitios de la célula fúngica altera o interrumpe numerosos procesos bioquímicos a nivel celular, esta característica hace prácticamente imposible que los patógenos puedan desarrollar resistencia al fungicida. Es un polvo humectable con 800 g/kg del ingrediente activo Mancozeb. Recomendado para el control de un amplio espectro de enfermedades fúngicas en una gran variedad de cultivos.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'KG',
                'precio_unitario' => 23600.00,
                'stock_disponible'=> 700,
                'stock_minimo'    => 35,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 46000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 44000.00],
                    ['cantidad_minima' => 60, 'precio_unidad' => 42000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-006',
                'nombre'          => 'Confidor X 500 Cc',
                'descripcion'     => 'Confidor x 500 Cc insecticida sistémico de amplio espectro. Confidor 350SC es un insecticida altamente eficaz de acción sistémica, formulado con Imidacloprid, ideal para el control de insectos picadores y chupadores en diversos cultivos. Su capacidad para actuar tanto por contacto como por ingestión lo convierte en una solución integral para el manejo de plagas difíciles y resistentes a otros tratamientos. Excelente eficacia contra mosca blanca, pulgones, prodiplosis y mosca de la fruta.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 86800.00,
                'stock_disponible'=> 350,
                'stock_minimo'    => 17,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 91000.00],
                    ['cantidad_minima' => 24, 'precio_unidad' => 87000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-007',
                'nombre'          => 'TRICHODERMA HARZIANUM BIOFUNGO',
                'descripcion'     => 'TRICHODERMA HARZIANUM BIOFUNGO es un acondicionador, antagonista y agente biotecnológico que actúa preventivamente como bio regulador de los fitopatógenos que causan daño en los tallos, hojas, flores y frutos de los cultivos agrícolas. Actúa preventivamente como antagonista y bio regulador de enfermedades sobre la superficie de los tallos, hojas, flores y frutos de las plantas. Crece y coloniza muy rápidamente, quitándole por antagonismo el espacio a los fitopatógenos hasta desplazarlos y parasitarlos.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'KG',
                'precio_unitario' => 51200.00,
                'stock_disponible'=> 200,
                'stock_minimo'    => 10,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 139000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 134000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-008',
                'nombre'          => 'HERBICIDA ATRAZINA 500 SC',
                'descripcion'     => 'HERBICIDA ATRAZINA 500 SC en forma de SUSPENSIÓN CONCENTRADA que tiene como ingrediente activo la ATRAZINA en una concentración de 500 g/l. Aplique el herbicida en pre emergencia o emergencia temprana de malezas; controla malezas de hoja ancha y gramíneas anuales en maíz. Es absorbida principalmente por las raíces, al igual que por las hojas, inhibe la fotosíntesis y controla principalmente malezas dicotiledóneas y algunas gramíneas.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'KG',
                'precio_unitario' => 27100.00,
                'stock_disponible'=> 500,
                'stock_minimo'    => 25,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 33000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 31000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-009',
                'nombre'          => 'INSECTICIDA LAMBDACIHALOTRINA TUMBADOR',
                'descripcion'     => 'TUMBADOR 250 SC es un insecticida sistémico que actúa por contacto e ingestión, con efecto de volteo. Actúa sobre el sistema nervioso de los insectos alterando el flujo de iones a través de la membrana nerviosa (moduladores del canal Na). Produce en pocos minutos la desorientación y el cese de alimentación del insecto. Adicionalmente interfiere los procesos de muda, la pupación normal y la posterior formación del adulto; interrumpe el ciclo de desarrollo de las larvas.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 20500.00,
                'stock_disponible'=> 400,
                'stock_minimo'    => 20,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 82000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 78000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-010',
                'nombre'          => 'FUNGICIDA TEBUCONAZOLE + TRIFLOXYSTROBIN NATIVO SC 300',
                'descripcion'     => 'FUNGICIDA TEBUCONAZOLE + TRIFLOXYSTROBIN NATIVO SC 300 multipropósito, de acción sistémica y mesostémica que ofrece un control confiable para un amplio espectro de enfermedades, como Royas, Oidios y Manchas foliares, gracias a sus dos principios activos que detienen rápidamente el desarrollo del hongo. Provee una acción curativa adicional y evita cepas resistentes; evita la germinación y el desarrollo de las esporas. Tiene un potente efecto preventivo con excelente acción residual.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 177300.00,
                'stock_disponible'=> 300,
                'stock_minimo'    => 15,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 159000.00],
                    ['cantidad_minima' => 24, 'precio_unidad' => 153000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-011',
                'nombre'          => 'HERBICIDA PARAQUAT GRAMAFÍN SL',
                'descripcion'     => 'GRAMAFIN SL es un herbicida no selectivo que tiene como ingrediente activo EL PARAQUAT en forma de sal dicloruro, en una concentración de 200 g/l del ión Paraquat libre (265,0 g/l de la sal). Es un herbicida líquido, concentrado soluble, no selectivo, que actúa por contacto sobre las partes verdes de las plantas, no daña la corteza madura, se inactiva inmediatamente cuando entra en contacto con el suelo.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 20600.00,
                'stock_disponible'=> 700,
                'stock_minimo'    => 35,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 40000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 38000.00],
                    ['cantidad_minima' => 60, 'precio_unidad' => 36000.00],
                ],
            ],
            [
                'sku'             => 'AGRO-012',
                'nombre'          => 'HERBICIDA GLIFOSATO CREDIT 480 (galón)',
                'descripcion'     => 'Glifosato Credit es un herbicida de amplio espectro diseñado para el control efectivo de malezas en cultivos y áreas de mantenimiento. Su fórmula actúa sobre todo tipo de malezas, permitiendo proteger tus cultivos y optimizar el rendimiento de tus terrenos. Ideal para agricultores que buscan soluciones prácticas y confiables en el manejo de malezas. Aplicación versátil en diferentes tipos de cultivos y condiciones.',
                'categoria_slug'  => 'agroquimicos',
                'unidad_codigo'   => 'GAL',
                'precio_unitario' => 15990.00,
                'stock_disponible'=> 400,
                'stock_minimo'    => 20,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 130000.00],
                    ['cantidad_minima' => 24, 'precio_unidad' => 125000.00],
                    ['cantidad_minima' => 60, 'precio_unidad' => 120000.00],
                ],
            ],

            // ── EQUIPOS ───────────────────────────────────────────────────────
            [
                'sku'             => 'EQUI-001',
                'nombre'          => 'Atomizador 1 Litro Ref:55938 Truper',
                'descripcion'     => 'Atomizador 1 Litro Truper - Riego y Aplicación Eficiente. Capacidad de 1 litro, fácil de usar y manejar. Ideal para riego y aplicación de productos agrícolas. Simplifica el cuidado de tus plantas con nuestro atomizador Truper.',
                'categoria_slug'  => 'equipos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 10800.00,
                'stock_disponible'=> 25,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 3,  'precio_unidad' => 3300000.00],
                    ['cantidad_minima' => 10, 'precio_unidad' => 3200000.00],
                ],
            ],
            [
                'sku'             => 'EQUI-002',
                'nombre'          => 'Desbrozadora STIHL FS 235',
                'descripcion'     => 'La Desbrozadora STIHL FS 235 es una herramienta potente y robusta, diseñada para el corte eficiente de hierbas, maleza densa y vegetación resistente en áreas agrícolas, forestales y rurales. Equipada con un motor 2-Mix de alto rendimiento, esta guadaña ofrece potencia superior con bajo consumo de combustible y mínimas emisiones contaminantes. Su estructura resistente y diseño ergonómico garantizan comodidad durante largas jornadas de trabajo.',
                'categoria_slug'  => 'equipos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 1735300.00,
                'stock_disponible'=> 30,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 3,  'precio_unidad' => 2580000.00],
                    ['cantidad_minima' => 10, 'precio_unidad' => 2500000.00],
                ],
            ],
            [
                'sku'             => 'EQUI-003',
                'nombre'          => 'Overol Industrial Platina',
                'descripcion'     => 'El Overol Industrial es una prenda de protección diseñada para ofrecer seguridad y comodidad a los trabajadores en entornos industriales. Hecho con materiales duraderos y resistentes, este overol proporciona una cobertura completa, protegiendo al usuario contra suciedad, productos químicos, y otros riesgos presentes en el lugar de trabajo. Ideal para una amplia variedad de industrias.',
                'categoria_slug'  => 'equipos',
                'unidad_codigo'   => 'KIT',
                'precio_unitario' => 109900.00,
                'stock_disponible'=> 100,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 5,  'precio_unidad' => 308000.00],
                    ['cantidad_minima' => 15, 'precio_unidad' => 296000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 285000.00],
                ],
            ],
            [
                'sku'             => 'EQUI-004',
                'nombre'          => 'Casco de Seguridad Forestal para Motoserrista',
                'descripcion'     => 'El Casco de Seguridad Forestal es un equipo de protección profesional diseñado para motoserristas y trabajadores forestales. Este casco está equipado con una visera de malla y un protector auditivo, brindando protección total durante el uso de motosierras y otros equipos de corte en ambientes forestales. Ideal para quienes necesitan seguridad y comodidad en su jornada de trabajo.',
                'categoria_slug'  => 'equipos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 140000.00,
                'stock_disponible'=> 15,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 3,  'precio_unidad' => 1790000.00],
                    ['cantidad_minima' => 10, 'precio_unidad' => 1740000.00],
                ],
            ],
            [
                'sku'             => 'EQUI-005',
                'nombre'          => 'Fumigadora Estacionaria OS-22 Motor 6.5 HP Warrior',
                'descripcion'     => 'La Fumigadora Estacionaria OS-22 es un equipo robusto y profesional diseñado para fumigación agrícola y desinfección a gran escala. Equipada con un motor gasolina Warrior Premium de 6.5 HP y una bomba de émbolo de alto rendimiento, ofrece una aspersión poderosa, constante y eficiente en diversos tipos de cultivos. Es una herramienta confiable para tareas agrícolas de alta exigencia, con disponibilidad de repuestos y excelente durabilidad.',
                'categoria_slug'  => 'equipos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 1622300.00,
                'stock_disponible'=> 12,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 3,  'precio_unidad' => 2130000.00],
                    ['cantidad_minima' => 10, 'precio_unidad' => 2060000.00],
                ],
            ],

            // ── FERTILIZANTES ─────────────────────────────────────────────────
            [
                'sku'             => 'FERT-001',
                'nombre'          => 'KCL CLORURO DE POTASIO 0-0-60',
                'descripcion'     => 'KCL CLORURO DE POTASIO 0-0-60 es un fertilizante potásico granular para aplicación al suelo y preparación de mezclas NPK. Indicado para cultivos exigentes en potasio y suelos deficientes del elemento. No recomendable para tabaco, cultivos sensibles al cloro ni suelos salinos con exceso de cloruros. Su uso se ajusta según necesidades del cultivo y etapa de desarrollo. Componente esencial para formular mezclas físicas balanceadas.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 175000.00,
                'stock_disponible'=> 1200,
                'stock_minimo'    => 60,
                'destacado'       => true,
                'precios_volumen' => [
                    ['cantidad_minima' => 20,  'precio_unidad' => 168000.00],
                    ['cantidad_minima' => 50,  'precio_unidad' => 162000.00],
                    ['cantidad_minima' => 100, 'precio_unidad' => 156000.00],
                ],
            ],
            [
                'sku'             => 'FERT-002',
                'nombre'          => 'UREA GRANULADA (46-0-0) x 50 kg',
                'descripcion'     => 'Urea Granulada 46-0-0 es un fertilizante de alta concentración que aporta 46% de nitrógeno, ideal para estimular el crecimiento vegetativo y mejorar el rendimiento de los cultivos en etapas de alta demanda nutricional. En compras de volumen se valida previamente inventario, precio y condiciones de entrega antes de confirmar el pedido.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 179600.00,
                'stock_disponible'=> 1500,
                'stock_minimo'    => 75,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20,  'precio_unidad' => 139000.00],
                    ['cantidad_minima' => 50,  'precio_unidad' => 134000.00],
                    ['cantidad_minima' => 100, 'precio_unidad' => 129000.00],
                ],
            ],
            [
                'sku'             => 'FERT-003',
                'nombre'          => 'FERTILIZANTE Y ABONO SULFATO DE AMONIO',
                'descripcion'     => 'FERTILIZANTE Y ABONO SULFATO DE AMONIO, fuente de nitrógeno y azufre. Ambos nutrientes son de disponibilidad inmediata. Es ideal para aplicaciones en suelos neutros y también alcalinos. Tiene efecto acidificante en el suelo, producto de la nitrificación del ión amonio. El amonio al estar cargado positivamente es retenido por las arcillas del suelo hasta el momento de la nitrificación. El sulfato es de disponibilidad inmediata, siendo una fuente de azufre muy efectiva.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 132000.00,
                'stock_disponible'=> 900,
                'stock_minimo'    => 45,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20, 'precio_unidad' => 126000.00],
                    ['cantidad_minima' => 50, 'precio_unidad' => 121000.00],
                ],
            ],
            [
                'sku'             => 'FERT-004',
                'nombre'          => 'DAP GRANULADO (18-46-0) x 50 kg',
                'descripcion'     => 'DAP Granulado 18-46-0 (fosfato diamónico) es un fertilizante de alta concentración en fósforo y nitrógeno, diseñado para promover el desarrollo radicular, la germinación y el establecimiento temprano del cultivo. En compras de volumen se valida previamente inventario, precio y condiciones de entrega.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 240600.00,
                'stock_disponible'=> 600,
                'stock_minimo'    => 30,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20,  'precio_unidad' => 212000.00],
                    ['cantidad_minima' => 50,  'precio_unidad' => 205000.00],
                    ['cantidad_minima' => 100, 'precio_unidad' => 198000.00],
                ],
            ],
            [
                'sku'             => 'FERT-005',
                'nombre'          => 'Fertilizante Simple Borato 48% x 50 kg',
                'descripcion'     => 'El Fertilizante Simple Borato 48% x 50 kg es un abono cristalino para aplicación directa al suelo, formulado como fuente de boro de alta concentración (15% de B y 48% de B₂O₃). Es especialmente útil para corregir deficiencias de boro en cultivos exigentes o en suelos con bajos niveles de este micronutriente esencial. Su aplicación promueve un crecimiento equilibrado y el correcto desarrollo de flores, frutos y tejidos vegetales. No es apto para uso foliar.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 293900.00,
                'stock_disponible'=> 400,
                'stock_minimo'    => 20,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 174000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 168000.00],
                    ['cantidad_minima' => 50, 'precio_unidad' => 162000.00],
                ],
            ],
            [
                'sku'             => 'FERT-006',
                'nombre'          => 'SULFATO DE MAGNESIO AGRÍCOLA GRANULAR',
                'descripcion'     => 'El sulfato de magnesio agrícola granular aporta Mg soluble, de rápida asimilación. Además aporta azufre. La gran importancia del Magnesio radica en su alta participación en el proceso de la fotosíntesis, ya que es el elemento central de la molécula de la clorofila. La deficiencia de magnesio puede ser un factor importante que limita la producción de cultivos. Fertilizante especial para aplicar al suelo que contiene Magnesio y Azufre en la nutrición edáfica y de precisión.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 67730.00,
                'stock_disponible'=> 500,
                'stock_minimo'    => 25,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20, 'precio_unidad' => 159000.00],
                    ['cantidad_minima' => 50, 'precio_unidad' => 153000.00],
                ],
            ],
            [
                'sku'             => 'FERT-007',
                'nombre'          => 'NPK Grado Palmero (13-5-27-5Mg-0,5B) x 50 kg',
                'descripcion'     => 'NPK Grado Palmero 13-5-27-5Mg-0,5B es un fertilizante complejo NPK granulado formulado para aportar alto potasio, magnesio y boro, ideal para optimizar el rendimiento y desarrollo en cultivos de alta demanda nutricional como palma de aceite, banano y frutales. En compras de volumen se valida previamente inventario, precio y condiciones de entrega.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 15300.00,
                'stock_disponible'=> 1000,
                'stock_minimo'    => 50,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20,  'precio_unidad' => 188000.00],
                    ['cantidad_minima' => 50,  'precio_unidad' => 181000.00],
                    ['cantidad_minima' => 100, 'precio_unidad' => 175000.00],
                ],
            ],
            [
                'sku'             => 'FERT-008',
                'nombre'          => 'FERTILIZANTE ROCA FOSFÓRICA 24%',
                'descripcion'     => 'ENMIENDA MINERAL ROCA FOSFÓRICA 24% es totalmente natural extraída de yacimientos en forma de piedra y terrones. El elemento primordial es el fósforo que actúa como fertilizante y corrector de suelos. El fósforo posee ácidos nucleicos y fosfolípidos indispensables en procesos donde hay transformación de energía. La asimilación de sus componentes es lenta, lo que permite a la planta tomar las dosis correctas de acuerdo a sus necesidades. Actúa como fertilizante fuente de Fósforo y Calcio, y neutraliza suelos ácidos.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 31600.00,
                'stock_disponible'=> 800,
                'stock_minimo'    => 40,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 50,  'precio_unidad' => 88000.00],
                    ['cantidad_minima' => 100, 'precio_unidad' => 84000.00],
                ],
            ],
            [
                'sku'             => 'FERT-009',
                'nombre'          => 'SULFATO DE POTASIO HAIFA SOP 0-0-52 +18S',
                'descripcion'     => 'Haifa SOP es un fertilizante de Sulfato Potásico para nutrigación en todos los cultivos, tanto en campo abierto como protegidos. Combina potasio y azufre, dos nutrientes esenciales para el desarrollo de las plantas. Fuente recomendada de potasio cuando se requiere azufre, o cuando la aplicación de nitrógeno debe ser limitada. La aplicación de Haifa SOP aumenta la resistencia de las plantas a la sequía, a las heladas, a los insectos y a las enfermedades.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 158900.00,
                'stock_disponible'=> 350,
                'stock_minimo'    => 17,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20, 'precio_unidad' => 270000.00],
                    ['cantidad_minima' => 50, 'precio_unidad' => 260000.00],
                ],
            ],
            [
                'sku'             => 'FERT-010',
                'nombre'          => 'YaraMila Hydran (19-04-19) x 50 kg',
                'descripcion'     => 'YaraMila Hydran 19-4-19 es un fertilizante complejo NPK granulado que aporta nitrógeno, fósforo, potasio, magnesio, azufre y micronutrientes en proporciones equilibradas, ideal para optimizar el crecimiento vegetativo y la producción sostenida en cultivos de alta exigencia. En compras de volumen se valida previamente inventario, precio y condiciones de entrega.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 185100.00,
                'stock_disponible'=> 600,
                'stock_minimo'    => 30,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20,  'precio_unidad' => 236000.00],
                    ['cantidad_minima' => 50,  'precio_unidad' => 228000.00],
                    ['cantidad_minima' => 100, 'precio_unidad' => 220000.00],
                ],
            ],
            [
                'sku'             => 'FERT-011',
                'nombre'          => 'Fertilizante Simple Borato 48% x 50 kg (caja)',
                'descripcion'     => 'El Fertilizante Simple Borato 48% x 50 kg es un abono cristalino para aplicación directa al suelo, formulado como fuente de boro de alta concentración (15% de B y 48% de B₂O₃). Especialmente útil para corregir deficiencias de boro en cultivos exigentes. Su aplicación promueve un crecimiento equilibrado y el correcto desarrollo de flores, frutos y tejidos vegetales. No es apto para uso foliar.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 293900.00,
                'stock_disponible'=> 300,
                'stock_minimo'    => 15,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 192000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 186000.00],
                ],
            ],
            [
                'sku'             => 'FERT-012',
                'nombre'          => 'ABONO ORGÁNICO COMPOSTADO BIO ORGÁNICOS',
                'descripcion'     => 'ABONO ORGÁNICO COMPOSTADO BIO ORGÁNICOS es un acondicionador orgánico estabilizado para suelos, resultado de la transformación biooxidativa de materiales orgánicos sólidos, favorecida por microorganismos descomponedores. Tiene una apariencia sólida de color café-pardo, textura fina heterogénea y olor característico. Su empaque es un saco en polipropileno blanco laminado, reciclable 100%. Es esencial tener cuidado con solventes orgánicos, agentes oxidantes y reductores, ácidos y bases fuertes.',
                'categoria_slug'  => 'fertilizantes',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 18650.00,
                'stock_disponible'=> 2000,
                'stock_minimo'    => 100,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 50,  'precio_unidad' => 33000.00],
                    ['cantidad_minima' => 100, 'precio_unidad' => 31000.00],
                    ['cantidad_minima' => 200, 'precio_unidad' => 29000.00],
                ],
            ],

            // ── HERRAMIENTAS ──────────────────────────────────────────────────
            [
                'sku'             => 'HERR-001',
                'nombre'          => 'Machete Corneta 20" Niquelado 3 Rayas',
                'descripcion'     => 'Machete Corneta 20" Niquelado 3 Rayas es la herramienta perfecta para agricultores y jardineros que buscan un rendimiento excepcional en sus labores agrícolas y de jardinería. Fabricado con acero de alta calidad y recubierto de níquel, este machete garantiza una durabilidad superior y un corte preciso, facilitando tareas exigentes como desbroce, limpieza de terrenos y manejo de vegetación densa.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 27100.00,
                'stock_disponible'=> 250,
                'stock_minimo'    => 12,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 91000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 87000.00],
                ],
            ],
            [
                'sku'             => 'HERR-002',
                'nombre'          => 'Palín Desmanchador Herragro',
                'descripcion'     => 'La Desmalezadora Profesional de Jardín es la herramienta definitiva para mantener tus espacios exteriores impecables. Con una capacidad de alcanzar profundidades de hasta 15 cm y un innovador sistema de control de ajuste de profundidad, este producto está diseñado para facilitar la extracción efectiva de hierbas y malezas, asegurando un jardín limpio y saludable. Su diseño permite remover hasta las raíces de las malezas, evitando su reaparición.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 24500.00,
                'stock_disponible'=> 300,
                'stock_minimo'    => 15,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 62000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 59000.00],
                ],
            ],
            [
                'sku'             => 'HERR-003',
                'nombre'          => 'Machete Barrigón Gavilán Colorado 20"',
                'descripcion'     => 'El Machete Barrigón Gavilán Colorado de 20 pulgadas es la herramienta ideal para trabajos pesados en el campo como corte de caña, monte, rastrojo y mantenimiento de zonas agrícolas. Su diseño "barrigón" permite mayor área de contacto con el material a cortar, ofreciendo cortes más amplios y eficientes. Fabricado por Gavilán, reconocida marca colombiana por su durabilidad y calidad.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 21400.00,
                'stock_disponible'=> 400,
                'stock_minimo'    => 20,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 46000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 44000.00],
                    ['cantidad_minima' => 60, 'precio_unidad' => 42000.00],
                ],
            ],
            [
                'sku'             => 'HERR-004',
                'nombre'          => 'Tijera de Podar a Una Mano',
                'descripcion'     => 'La Tijera de Podar a Una Mano es la herramienta ideal para realizar podas precisas y eficientes en plantas, arbustos y árboles pequeños. Diseñada con lámina templada de acero al carbono, garantiza cortes limpios y suaves, minimizando el daño a las plantas. Su mango ergonómico y anatómico proporciona un agarre cómodo y seguro, reduciendo la fatiga durante el uso. Filo de alta durabilidad.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 28800.00,
                'stock_disponible'=> 200,
                'stock_minimo'    => 10,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 72000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 69000.00],
                ],
            ],
            [
                'sku'             => 'HERR-005',
                'nombre'          => 'Pala Herragro N4',
                'descripcion'     => 'Pala Herragro N4, herramienta para labores agrícolas y de jardinería. Fabricada con materiales de alta resistencia para soportar trabajos exigentes en campo. Ideal para remoción de tierra, siembra y mantenimiento de cultivos.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 24500.00,
                'stock_disponible'=> 350,
                'stock_minimo'    => 17,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 53000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 51000.00],
                ],
            ],
            [
                'sku'             => 'HERR-006',
                'nombre'          => 'Carretilla Tramontina Extraforte 65 L',
                'descripcion'     => 'La Carretilla de Mano Extraforte 65L Gris es la herramienta indispensable para aquellos que requieren un transporte eficiente y seguro de materiales en trabajos de construcción, jardinería y uso industrial. Con una robusta estructura y un diseño pensado para maximizar la durabilidad, esta carretilla es capaz de soportar cargas de hasta 65 kg, convirtiéndola en tu mejor aliada en tareas pesadas.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 614000.00,
                'stock_disponible'=> 80,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 5,  'precio_unidad' => 270000.00],
                    ['cantidad_minima' => 15, 'precio_unidad' => 260000.00],
                ],
            ],
            [
                'sku'             => 'HERR-007',
                'nombre'          => 'Lima Triangular 6" Para Afilado - Herragro',
                'descripcion'     => 'Lima Triangular de 6 pulgadas es la herramienta indispensable para mantener tus herramientas de corte en óptimas condiciones. Diseñada para proporcionar un afilado eficiente y duradero, esta lima combina un mango ergonómico y un acero especial certificado para garantizar un rendimiento excepcional en el desbaste. Fabricada con acero de alta calidad, ofrece una vida útil prolongada, reduciendo la necesidad de reemplazos frecuentes.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 5200.00,
                'stock_disponible'=> 600,
                'stock_minimo'    => 30,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20,  'precio_unidad' => 21000.00],
                    ['cantidad_minima' => 50,  'precio_unidad' => 20000.00],
                    ['cantidad_minima' => 100, 'precio_unidad' => 19000.00],
                ],
            ],
            [
                'sku'             => 'HERR-008',
                'nombre'          => 'Canastilla Cosechadora Telescópica 3 MTS',
                'descripcion'     => 'La Canastilla Cosechadora Telescópica 3 MTS es una herramienta agrícola diseñada para facilitar la recolección de frutas en árboles altos. Su estructura telescópica permite alcanzar hasta 3 metros de altura, garantizando una cosecha eficiente y segura. Cuenta con una cuchilla de acero inoxidable que corta el pedúnculo sin dañar el fruto ni las ramas del árbol, junto con una bolsa recolectora de fácil limpieza.',
                'categoria_slug'  => 'herramientas',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 154100.00,
                'stock_disponible'=> 60,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 3,  'precio_unidad' => 720000.00],
                    ['cantidad_minima' => 10, 'precio_unidad' => 690000.00],
                ],
            ],

            // ── INSUMOS ───────────────────────────────────────────────────────
            [
                'sku'             => 'INSU-001',
                'nombre'          => 'NPK Grado Palmero (13-5-27-5Mg-0,5B) — presentación individual',
                'descripcion'     => 'NPK Grado Palmero 13-5-27-5Mg-0,5B es un fertilizante complejo NPK granulado formulado para aportar alto potasio, magnesio y boro, ideal para optimizar el rendimiento y desarrollo en cultivos de alta demanda nutricional como palma de aceite, banano y frutales. Presentación individual para pequeñas aplicaciones.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 15300.00,
                'stock_disponible'=> 80,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 5,  'precio_unidad' => 820000.00],
                    ['cantidad_minima' => 20, 'precio_unidad' => 790000.00],
                ],
            ],
            [
                'sku'             => 'INSU-002',
                'nombre'          => 'BOLSAS PARA VIVERO',
                'descripcion'     => 'BOLSAS PARA VIVERO fabricadas con polietileno que se utilizan para la siembra y el cultivo de plantas. Diseñadas para ofrecer una solución práctica y eficiente para el crecimiento de plantas, arbustos y árboles. Fabricadas con materiales resistentes y duraderos, son ideales para viveros, huertos y jardines. Son más económicas que las macetas tradicionales, especialmente en cultivos masivos.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 62182.35,
                'stock_disponible'=> 500,
                'stock_minimo'    => 25,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 91000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 87000.00],
                    ['cantidad_minima' => 50, 'precio_unidad' => 83000.00],
                ],
            ],
            [
                'sku'             => 'INSU-003',
                'nombre'          => 'SUSTRATO TURBA KEKKILA',
                'descripcion'     => 'SUSTRATO TURBA KEKKILA para semillero en plantulación, huertas, semilleros y viveros, ya sea por semilla, esqueje o estolón. Kekkilä es un producto de la máxima calidad a nivel mundial. Sus principales componentes se originan a partir de una selección de las mejores turbas pardas de turberas propias de la Empresa. El producto contiene 10% Perlita. Su uso es generalizado en producción de plántulas de tomate, pimentón, brócoli, zanahoria, repollo, gulupa, melón y otros cultivos.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'BLT',
                'precio_unitario' => 88000.00,
                'stock_disponible'=> 300,
                'stock_minimo'    => 15,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20, 'precio_unidad' => 84000.00],
                    ['cantidad_minima' => 50, 'precio_unidad' => 80000.00],
                ],
            ],
            [
                'sku'             => 'INSU-004',
                'nombre'          => 'ADHERENTE SYS',
                'descripcion'     => 'La novedosa formula de ADHERENTE SYS posee agentes de actividad superficial que permite un mejor cubrimiento y homogeneidad de la aspersión, y una mayor retención y absorción del agroquímico en el objetivo. Contiene sustancias poliméricas que forman una fina película sobre la superficie tratada (acción pegante), protegiendo el agroquímico de condiciones adversas como lavado por lluvias, evaporación por altas temperaturas, fotodegradación y arrastre por el viento.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 24731.82,
                'stock_disponible'=> 600,
                'stock_minimo'    => 30,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 30000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 28000.00],
                ],
            ],
            [
                'sku'             => 'INSU-005',
                'nombre'          => 'COADYUVANTE BIODEGRADABLE FLUYEX',
                'descripcion'     => 'COADYUVANTE BIODEGRADABLE FLUYEX mejora las condiciones físico-químicas de las aguas de aspersión. Es específico para aguas sin problemas de dureza. Su regulador de pH establece la calidad del agua en un punto óptimo para el uso de diferentes agroquímicos, herbicidas, fungicidas, insecticidas, foliares y bioestimulantes. También reduce la tensión superficial del agua facilitando los procesos de dispersión, logrando un mayor cubrimiento sobre la superficie aplicada.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'LT',
                'precio_unitario' => 22491.00,
                'stock_disponible'=> 500,
                'stock_minimo'    => 25,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 12, 'precio_unidad' => 36000.00],
                    ['cantidad_minima' => 30, 'precio_unidad' => 34000.00],
                ],
            ],
            [
                'sku'             => 'INSU-006',
                'nombre'          => 'CEBO ATRAYENTE BABOXA SB',
                'descripcion'     => 'CEBO ATRAYENTE BABOXA SB es un cebo atrayente para el control de moluscos plaga, como babosas y el caracol africano, con tres ingredientes activos en su composición que actúan por ingestión y por contacto. Con efecto estomacal que adormece al molusco e induce a una mayor secreción de la mucosidad, lo cual provoca la deshidratación y la muerte. Viene listo para usar, no necesita mezclarse para su aplicación.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 14500.00,
                'stock_disponible'=> 200,
                'stock_minimo'    => 10,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 43000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 41000.00],
                ],
            ],
            [
                'sku'             => 'INSU-007',
                'nombre'          => 'Guantes Latex Talla L Otai Caja x 100 Unds',
                'descripcion'     => 'Los Guantes de Látex Otai Talla L ofrecen una protección confiable en tareas que requieren higiene, seguridad y precisión. Fabricados con látex natural de alta calidad, proporcionan una excelente sensibilidad táctil, ajuste ergonómico y resistencia superior frente a contaminantes y fluidos. Actúan como barrera eficaz frente a agentes biológicos, químicos y suciedad. Se adaptan a la forma de la mano permitiendo mayor destreza y precisión.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 28300.00,
                'stock_disponible'=> 400,
                'stock_minimo'    => 20,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 62000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 59000.00],
                    ['cantidad_minima' => 50, 'precio_unidad' => 56000.00],
                ],
            ],
            [
                'sku'             => 'INSU-008',
                'nombre'          => 'Trampa De Golpe Con Barra Metálica',
                'descripcion'     => 'Trampa de Control para Ratas y Ratones es la solución definitiva para el manejo de plagas en tu hogar o negocio. Diseñada con un innovador sistema de activación, esta trampa captura roedores de manera segura y eficiente, sin el uso de sustancias químicas, ofreciendo un método de control físico que es seguro tanto para los humanos como para las mascotas. Captura ratas y ratones con una velocidad extraordinaria, garantizando un control efectivo de plagas.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 24900.00,
                'stock_disponible'=> 150,
                'stock_minimo'    => 7,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 5,  'precio_unidad' => 212000.00],
                    ['cantidad_minima' => 15, 'precio_unidad' => 204000.00],
                ],
            ],
            [
                'sku'             => 'INSU-009',
                'nombre'          => 'CINTA PARA IDENTIFICACIÓN DE FRUTA',
                'descripcion'     => 'La cinta de polietileno de baja densidad es utilizada para llevar inventario de fruta existente en campo. La identificación de fruta mediante el cinteo de las plantas se usa por los productores de plátano y banano, haciendo un recorrido semanal por la plantación, de manera que las plantas paridas en esa semana se identifican con el color asignado a esa semana. Disponible en múltiples colores para manejo semanal del inventario.',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 14100.00,
                'stock_disponible'=> 800,
                'stock_minimo'    => 40,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 20, 'precio_unidad' => 17000.00],
                    ['cantidad_minima' => 50, 'precio_unidad' => 16000.00],
                ],
            ],
            [
                'sku'             => 'INSU-010',
                'nombre'          => 'MYCOFERT MICORRIZA',
                'descripcion'     => 'MYCOFERT MICORRIZA es un inoculante que contiene raíces colonizadas (vesículas, hifas y esporas) y micelio externo de hongos benéficos que forman micorriza del tipo arbuscular (MA). Contiene diferentes especies de hongos seleccionadas por ser eficientes sobre el crecimiento y rendimiento de diferentes cultivos. Contiene un mínimo de 5 esporas viables por gramo y un porcentaje de colonización de raíces mínimo del 40%. Mejora la absorción de nutrientes (fósforo principalmente).',
                'categoria_slug'  => 'insumos',
                'unidad_codigo'   => 'KG',
                'precio_unitario' => 17600.00,
                'stock_disponible'=> 250,
                'stock_minimo'    => 12,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 10, 'precio_unidad' => 75000.00],
                    ['cantidad_minima' => 25, 'precio_unidad' => 72000.00],
                ],
            ],

            // ── MAQUINARIA ────────────────────────────────────────────────────
            [
                'sku'             => 'MAQU-001',
                'nombre'          => 'Tractor Cortacésped Husqvarna TS 217Tm',
                'descripcion'     => 'El Tractor Cortacésped Husqvarna TS 217Tm es una potente herramienta diseñada para facilitar el cuidado de grandes áreas de césped. Con un motor de 19.4 HP y un ancho de corte de 108 cm, este tractor proporciona un corte eficiente, ideal para céspedes amplios. Su transmisión automática y sistema ergonómico hacen que sea fácil y cómodo de manejar. Equipado con faros LED y una plataforma de corte ajustable.',
                'categoria_slug'  => 'maquinaria',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 22658200.00,
                'stock_disponible'=> 4,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [],
            ],
            [
                'sku'             => 'MAQU-002',
                'nombre'          => 'Tijera Cosechadora Podadora 2 metros',
                'descripcion'     => 'La Tijera Cosechadora Podadora 2 Metros es una herramienta agrícola diseñada especialmente para la recolección eficiente de frutas en árboles y arbustos altos. Gracias a sus materiales de alta calidad y diseño ergonómico, facilita un corte limpio que protege tanto el fruto como la planta. Su cuchilla de acero inoxidable garantiza un corte plano que evita el ingreso de patógenos.',
                'categoria_slug'  => 'maquinaria',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 202800.00,
                'stock_disponible'=> 6,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 2, 'precio_unidad' => 17800000.00],
                ],
            ],
            [
                'sku'             => 'MAQU-003',
                'nombre'          => 'Guadañadora Husqvarna 531RB',
                'descripcion'     => 'La Guadañadora Husqvarna 531RB es una herramienta diseñada para trabajos exigentes en terrenos difíciles, ideal para labores de desbroce en áreas agrícolas, forestales y rurales. Motor de 33,6 cm³ y 1,6 HP para trabajos intensivos. Excelente desempeño para desbrozar maleza densa y arbustos. Mayor comodidad con su diseño ergonómico y sistema de amortiguación anti-vibración.',
                'categoria_slug'  => 'maquinaria',
                'unidad_codigo'   => 'UND',
                'precio_unitario' => 1882640.69,
                'stock_disponible'=> 8,
                'stock_minimo'    => 5,
                'destacado'       => false,
                'precios_volumen' => [
                    ['cantidad_minima' => 2, 'precio_unidad' => 13700000.00],
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

            $sku = $data['sku'];

            $producto = MarketProducto::updateOrCreate(
                ['sku' => $sku],
                array_merge($data, [
                    'proveedor_id'     => $proveedor->id,
                    'categoria_id'     => $cats[$categoriaSlug]->id,
                    'unidad_medida_id' => $unds[$unidadCodigo]->id,
                    'imagen_principal' => '/assets/images/products/' . $sku . '.jpg',
                    'estado'           => 'activo',
                ])
            );

            // Sincronizar precios de volumen: elimina los anteriores y recrea
            if ($producto->wasRecentlyCreated || count($preciosVolumen) > 0) {
                $producto->preciosVolumen()->delete();
                foreach ($preciosVolumen as $pv) {
                    MarketPrecioVolumen::create(array_merge($pv, [
                        'producto_id' => $producto->id,
                        'activo'      => true,
                    ]));
                }
            }

            // Imagen en galería para que el endpoint de detalle retorne array imagenes
            MarketProductoImagen::firstOrCreate(
                ['producto_id' => $producto->id, 'orden' => 1],
                [
                    'url'      => '/assets/images/products/' . $sku . '.jpg',
                    'alt_text' => $producto->nombre,
                ]
            );

            $productoModels[$sku] = $producto;
        }

        // ── 6. ACTIVAR MÓDULO MARKET EN TENANT DEMO ───────────────────────────
        // Comentado: esta sección asocia pedidos demo y carrito al tenant "Finca La Esperanza".
        // Requiere que el tenant exista (creado en DatabaseSeeder). Descomentar cuando el
        // tenant demo vuelva a estar activo en el seeder principal.
        //
        // $tenantDemo = Tenant::where('nombre', 'Finca La Esperanza')->first();
        //
        // if ($tenantDemo) {
        //     TenantConfig::where('tenant_id', $tenantDemo->id)
        //         ->update(['modulo_market' => true]);
        //
        //     $kcl       = $productoModels['FERT-001'];
        //     $urea      = $productoModels['FERT-002'];
        //     $glifosato = $productoModels['AGRO-001'];
        //     $direccion = "{$tenantDemo->direccion}, {$tenantDemo->municipio}, {$tenantDemo->departamento}";
        //
        //     // PED-001: En tránsito (10x KCL + 5x Glifosato)
        //     // PED-002: Entregado (8x Urea)
        //     // PED-003: Confirmado (50x Urea — precio volumen)
        //     // ── 7. CARRITO DEMO ──
        // }

        $this->command->info('');
        $this->command->info('──────────────────────────────────────────────────────');
        $this->command->info(' MARKET — Seeder ejecutado');
        $this->command->info('──────────────────────────────────────────────────────');
        $this->command->info(' Proveedor : AgroInsumos del Valle');
        $this->command->info(' Admin     : admin@agroinsumosdelvalle.com / password');
        $this->command->info(' Categorías: ' . count($categorias));
        $this->command->info(' Unidades  : ' . count($unidades));
        $this->command->info(' Productos : ' . count($productos));
        $this->command->info(' Imágenes  : /assets/images/products/<SKU>.jpg');
        $this->command->info(' Pedidos demo: 3 (tenant Finca La Esperanza)');
        $this->command->info('──────────────────────────────────────────────────────');
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
