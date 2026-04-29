<?php

namespace Database\Seeders;

use App\Models\Plano;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PlanoSeeder extends Seeder
{
    public function run(): void
    {
        $basico = Plano::firstOrCreate(['nome' => 'Básico'], [
            'descricao'       => 'Ideal para pequenas equipes e campanhas iniciais',
            'preco'           => 97,
            'limite_usuarios' => 3,
            'recursos'        => ['Dashboard eleitoral', 'Análise de candidatos', 'Comparativo básico', 'Suporte por email'],
        ]);

        Plano::firstOrCreate(['nome' => 'Profissional'], [
            'descricao'       => 'Para equipes em crescimento que precisam de mais poder',
            'preco'           => 197,
            'limite_usuarios' => 10,
            'recursos'        => ['Tudo do Básico', 'Estratégia eleitoral', 'Mapa interativo completo', 'Relatórios avançados', 'Suporte prioritário'],
        ]);

        Plano::firstOrCreate(['nome' => 'Empresarial'], [
            'descricao'       => 'Solução completa para grandes operações políticas',
            'preco'           => 497,
            'limite_usuarios' => 50,
            'recursos'        => ['Tudo do Profissional', 'Importação de dados', 'API de integração', 'Usuários ilimitados', 'Gerente de conta dedicado', 'SLA garantido'],
        ]);

        // Admin SaaS padrão
        User::firstOrCreate(['email' => 'admin@inteleitoral.com'], [
            'name'     => 'Administrador',
            'password' => Hash::make('admin123'),
            'role'     => 'admin_saas',
            'ativo'    => true,
        ]);
    }
}
