<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UsuarioCliente extends Model
{
    protected $table = 'usuarios_cliente';

    protected $fillable = ['cliente_id', 'nome', 'email', 'senha', 'cargo', 'ativo', 'ultimo_acesso'];

    protected $hidden = ['senha'];

    protected $casts = [
        'ativo'         => 'boolean',
        'ultimo_acesso' => 'datetime',
    ];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cliente_id');
    }
}
