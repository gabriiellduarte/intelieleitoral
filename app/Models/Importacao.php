<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Importacao extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'arquivo_nome',
        'tipo',
        'status',
        'total_linhas',
        'processados',
        'erros',
        'metadados',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'metadados' => 'json',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relacionamento com raw_candidatos
     */
    public function rawCandidatos(): HasMany
    {
        return $this->hasMany(RawCandidato::class);
    }

    /**
     * Relacionamento com raw_secoes
     */
    public function rawSecoes(): HasMany
    {
        return $this->hasMany(RawSecao::class);
    }

    /**
     * Scopes
     */

    /**
     * Filtrar importações em processamento
     */
    public function scopeProcessando($query)
    {
        return $query->where('status', 'processando');
    }

    /**
     * Filtrar importações concluídas
     */
    public function scopeConcluida($query)
    {
        return $query->where('status', 'concluido');
    }

    /**
     * Filtrar importações com erro
     */
    public function scopeComErro($query)
    {
        return $query->where('status', 'erro');
    }

    /**
     * Filtrar por tipo
     */
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Métodos auxiliares
     */

    /**
     * Verifica se a importação está em processamento
     */
    public function isProcessing(): bool
    {
        return $this->status === 'processando';
    }

    /**
     * Verifica se a importação foi concluída
     */
    public function isCompleted(): bool
    {
        return $this->status === 'concluido';
    }

    /**
     * Verifica se há erros na importação
     */
    public function hasErrors(): bool
    {
        return $this->erros > 0;
    }

    /**
     * Calcula a taxa de sucesso (percentual de registros processados)
     */
    public function taxaSucesso(): float
    {
        if ($this->total_linhas === 0) {
            return 0.0;
        }

        return ($this->processados / $this->total_linhas) * 100;
    }

    /**
     * Calcula a taxa de erro (percentual de registros com erro)
     */
    public function taxaErro(): float
    {
        if ($this->total_linhas === 0) {
            return 0.0;
        }

        return ($this->erros / $this->total_linhas) * 100;
    }

    /**
     * Retorna uma descrição legível do status
     */
    public function statusDescricao(): string
    {
        return match ($this->status) {
            'pendente' => 'Aguardando processamento',
            'processando' => 'Em processamento',
            'concluido' => 'Concluída com sucesso',
            'erro' => 'Finalizada com erro',
            default => 'Status desconhecido',
        };
    }
}
