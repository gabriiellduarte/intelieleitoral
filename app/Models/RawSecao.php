<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RawSecao extends Model
{
    use HasFactory;

    protected $table = 'raw_secoes';

    protected $fillable = [
        'importacao_id',
        'numero_linha',
        'status',
        'erros',
        // Dados de geração
        'DT_GERACAO',
        'HH_GERACAO',
        // Dados da eleição
        'ANO_ELEICAO',
        'CD_TIPO_ELEICAO',
        'NM_TIPO_ELEICAO',
        'CD_PLEITO',
        'DT_PLEITO',
        'NR_TURNO',
        'CD_ELEICAO',
        'DS_ELEICAO',
        'DT_ELEICAO',
        // Abrangência
        'TP_ABRANGENCIA',
        'SG_UF',
        'SG_UE',
        'NM_UE',
        // Localização
        'CD_MUNICIPIO',
        'NM_MUNICIPIO',
        'NR_ZONA',
        'NR_SECAO',
        'NR_LOCAL_VOTACAO',
        'NM_LOCAL_VOTACAO',
        'DS_LOCAL_VOTACAO_ENDERECO',
        // Cargo
        'CD_CARGO_PERGUNTA',
        'DS_CARGO_PERGUNTA',
        'DS_CARGO_PERGUNTA_SECAO',
        // Votável
        'NR_VOTAVEL',
        'NM_VOTAVEL',
        'CD_TIPO_VOTAVEL',
        'DS_TIPO_VOTAVEL',
        'NR_PARTIDO',
        'SG_PARTIDO',
        'NM_PARTIDO',
        'SQ_CANDIDATO',
        // Votos e apuração
        'QT_VOTOS',
        'QT_APTOS',
        'QT_COMPARECIMENTO',
        'QT_ABSTENCOES',
        // Urna
        'CD_TIPO_URNA',
        'DS_TIPO_URNA',
        'NR_URNA_EFETIVADA',
        'CD_CARGA_1_URNA_EFETIVADA',
        'CD_CARGA_2_URNA_EFETIVADA',
        'CD_FLASHCARD_URNA_EFETIVADA',
        'DT_CARGA_URNA_EFETIVADA',
        // Outros
        'DS_SECOES_AGREGADAS',
        'DT_ABERTURA',
        'DT_ENCERRAMENTO',
        'QT_ELEI_BIOM_SEM_HABILITACAO',
        'DT_EMISSAO_BU',
        'DT_BU_RECEBIDO',
        'NR_JUNTA_APURADORA',
        'NR_TURMA_APURADORA',
    ];

    protected $casts = [
        'erros' => 'json',
        'DT_GERACAO' => 'date',
        'DT_PLEITO' => 'date',
        'DT_ELEICAO' => 'date',
        'DT_CARGA_URNA_EFETIVADA' => 'datetime',
        'DT_ABERTURA' => 'datetime',
        'DT_ENCERRAMENTO' => 'datetime',
        'DT_EMISSAO_BU' => 'datetime',
        'DT_BU_RECEBIDO' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the importacao that owns this raw secao
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
