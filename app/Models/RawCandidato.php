<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RawCandidato extends Model
{
    use HasFactory;

    protected $table = 'raw_candidatos';

    protected $fillable = [
        'importacao_id',
        'numero_linha',
        'status',
        'erros',
        // Dados da eleição
        'DT_GERACAO',
        'HH_GERACAO',
        'ANO_ELEICAO',
        'CD_TIPO_ELEICAO',
        'NM_TIPO_ELEICAO',
        'NR_TURNO',
        'CD_ELEICAO',
        'DS_ELEICAO',
        'TP_ABRANGENCIA',
        'SG_UF',
        'SG_UE',
        'NM_UE',
        // Localização
        'CD_MUNICIPIO',
        'NM_MUNICIPIO',
        'NR_ZONA',
        // Candidato
        'SQ_CANDIDATO',
        'NM_CANDIDATO',
        'NM_URNA_CANDIDATO',
        'NM_SOCIAL_CANDIDATO',
        'NR_CANDIDATO',
        // Cargo e partido
        'CD_CARGO',
        'DS_CARGO',
        'NR_PARTIDO',
        'SG_PARTIDO',
        'NM_PARTIDO',
        // Votos
        'QT_VOTOS_NOMINAIS',
        'QT_VOTOS_NOMINAIS_VALIDOS',
        'DS_SIT_TOT_TURNO',
    ];

    protected $casts = [
        'erros' => 'json',
        'DT_GERACAO' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the importacao that owns this raw candidato
     */
    public function importacao()
    {
        return $this->belongsTo(Importacao::class);
    }

    /**
     * Scope: Get only pending records
     */
    public function scopePendente($query)
    {
        return $query->where('status', 'pendente');
    }

    /**
     * Scope: Get only processed records
     */
    public function scopeProcessado($query)
    {
        return $query->where('status', 'processado');
    }

    /**
     * Scope: Get only error records
     */
    public function scopeComErro($query)
    {
        return $query->where('status', 'erro');
    }

    /**
     * Check if this record has errors
     */
    public function temErros()
    {
        return !empty($this->erros) && is_array($this->erros);
    }

    /**
     * Get formatted errors
     */
    public function getErrorosFormatados()
    {
        return is_array($this->erros) ? implode(', ', $this->erros) : null;
    }
}
