<?php

namespace Database\Seeders;

use App\Models\Market\MarketBanco;
use Illuminate\Database\Seeder;

class MarketBancosSeeder extends Seeder
{
    public function run(): void
    {
        $bancos = [
            ['nombre' => 'Bancolombia',                    'codigo' => 'BCO',     'orden' => 1],
            ['nombre' => 'Davivienda',                     'codigo' => 'DAV',     'orden' => 2],
            ['nombre' => 'Banco de Bogotá',                'codigo' => 'BDB',     'orden' => 3],
            ['nombre' => 'BBVA Colombia',                  'codigo' => 'BBVA',    'orden' => 4],
            ['nombre' => 'Banco Popular',                  'codigo' => 'POP',     'orden' => 5],
            ['nombre' => 'Banco AV Villas',                'codigo' => 'AVV',     'orden' => 6],
            ['nombre' => 'Banco Caja Social',              'codigo' => 'BCS',     'orden' => 7],
            ['nombre' => 'Banco Falabella',                'codigo' => 'FAL',     'orden' => 8],
            ['nombre' => 'Banco Pichincha',                'codigo' => 'PICH',    'orden' => 9],
            ['nombre' => 'Citibank',                       'codigo' => 'CITI',    'orden' => 10],
            ['nombre' => 'Itaú',                           'codigo' => 'ITAU',    'orden' => 11],
            ['nombre' => 'Scotiabank Colpatria',           'codigo' => 'SCOT',    'orden' => 12],
            ['nombre' => 'Banco Agrario',                  'codigo' => 'AGR',     'orden' => 13],
            ['nombre' => 'Banco GNB Sudameris',            'codigo' => 'GNB',     'orden' => 14],
            ['nombre' => 'Banco Cooperativo Coopcentral',  'codigo' => 'COOP',    'orden' => 15],
            ['nombre' => 'Banco W',                        'codigo' => 'BW',      'orden' => 16],
            ['nombre' => 'Bancamía',                       'codigo' => 'BMIA',    'orden' => 17],
            ['nombre' => 'Bancoomeva',                     'codigo' => 'BOOM',    'orden' => 18],
            ['nombre' => 'Nequi',                          'codigo' => 'NEQUI',   'orden' => 19],
            ['nombre' => 'Daviplata',                      'codigo' => 'DAVIPL',  'orden' => 20],
            ['nombre' => 'Movii',                          'codigo' => 'MOVII',   'orden' => 21],
            ['nombre' => 'RappiPay',                       'codigo' => 'RAPPI',   'orden' => 22],
            ['nombre' => 'Lulo Bank',                      'codigo' => 'LULO',    'orden' => 23],
        ];

        foreach ($bancos as $b) {
            MarketBanco::updateOrCreate(
                ['nombre' => $b['nombre']],
                ['codigo' => $b['codigo'], 'orden' => $b['orden'], 'activo' => true],
            );
        }
    }
}
