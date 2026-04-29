<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plano extends Model
{
    protected $fillable = ['nome', 'descricao', 'preco', 'limite_usuarios', 'recursos', 'ativo'];

    protected $casts = [
        'recursos' => 'array',
        'ativo'    => 'boolean',
        'preco'    => 'float',
    ];

    public function clientes(): HasMany
    {
        return $this->hasMany(User::class, 'plano_id');
    }
}
