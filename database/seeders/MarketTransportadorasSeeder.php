<?php

namespace Database\Seeders;

use App\Models\Market\MarketTransportadora;
use Illuminate\Database\Seeder;

class MarketTransportadorasSeeder extends Seeder
{
    public function run(): void
    {
        $transportadoras = [
            ['nombre' => 'Servientrega',     'codigo' => 'SERV',  'orden' => 1],
            ['nombre' => 'Coordinadora',     'codigo' => 'COOR',  'orden' => 2],
            ['nombre' => 'Envía',            'codigo' => 'ENV',   'orden' => 3],
            ['nombre' => 'Interrapidisimo',  'codigo' => 'INTER', 'orden' => 4],
            ['nombre' => 'Deprisa',          'codigo' => 'DEP',   'orden' => 5],
            ['nombre' => 'TCC',              'codigo' => 'TCC',   'orden' => 6],
        ];

        foreach ($transportadoras as $t) {
            MarketTransportadora::updateOrCreate(
                ['nombre' => $t['nombre']],
                ['codigo' => $t['codigo'], 'orden' => $t['orden'], 'activo' => true],
            );
        }
    }
}
