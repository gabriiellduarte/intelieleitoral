<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class AppImportarController extends Controller
{
    /**
     * Renderiza a página de importação de dados eleitorais
     */
    public function index()
    {
        return Inertia::render('app/importar', [
            'informacoes' => [
                'descricao' => 'Importe dados eleitorais em formato CSV ou JSON',
                'extensoes_permitidas' => ['csv', 'json'],
                'tamanho_maximo' => '100MB',
            ],
        ]);
    }
}
