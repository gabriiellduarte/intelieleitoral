<?php

namespace App\Http\Controllers\Electoral;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class AppCandidatosController extends Controller
{
    public function index(int $eleicao)
    {
        return Inertia::render('app/candidatos', ['eleicao_id' => $eleicao]);
    }
}
