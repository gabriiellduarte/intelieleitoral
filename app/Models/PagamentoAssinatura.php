<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PagamentoAssinatura extends Model
{
    protected $table = 'pagamentos_assinaturas';

    protected $fillable = [
        'cliente_id',
        'plano_id',
        'valor',
        'moeda',
        'status',
        'metodo_pagamento',
        'referencia_externa',
        'pago_em',
    ];

    protected $casts = [
        'valor'   => 'float',
        'pago_em' => 'datetime',
    ];

    // ─── Relacionamentos ──────────────────────────────────────────────────────

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cliente_id');
    }

    public function plano(): BelongsTo
    {
        return $this->belongsTo(Plano::class, 'plano_id');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    /** Apenas pagamentos com status confirmado ('pago'). */
    public function scopePagos($query)
    {
        return $query->where('status', 'pago');
    }

    /** Apenas pagamentos pendentes. */
    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    // ─── Utilidades ───────────────────────────────────────────────────────────

    /**
     * Registra um pagamento vindo do Asaas de forma idempotente.
     *
     * Se já existir um registro com a mesma referencia_externa, simplesmente
     * atualiza o status sem criar duplicata.
     *
     * @param  array{
     *     cliente_id: int,
     *     plano_id?: int|null,
     *     valor: float,
     *     moeda?: string,
     *     status: string,
     *     metodo_pagamento?: string|null,
     *     referencia_externa: string,
     *     pago_em?: string|null
     * }  $dados
     */
    public static function registrarIdempotente(array $dados): self
    {
        return static::updateOrCreate(
            // Chave de idempotência: o ID de cobrança do Asaas
            ['referencia_externa' => $dados['referencia_externa']],
            [
                'cliente_id'         => $dados['cliente_id'],
                'plano_id'           => $dados['plano_id'] ?? null,
                'valor'              => $dados['valor'],
                'moeda'              => $dados['moeda'] ?? 'BRL',
                'status'             => $dados['status'],
                'metodo_pagamento'   => $dados['metodo_pagamento'] ?? null,
                'pago_em'            => $dados['pago_em'] ?? null,
            ]
        );
    }
}
