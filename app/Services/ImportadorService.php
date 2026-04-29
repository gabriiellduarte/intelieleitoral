<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ImportadorService
{
    /**
     * ═══════════════════════════════════════════════════════════════════════
     * ETAPA 1: CSV → raw_candidatos (Cópia Bruta, sem transformação)
     * ═══════════════════════════════════════════════════════════════════════
     */
    public function importarParaMatriz(UploadedFile $arquivo, int $importacaoId): array
    {
        $handle = fopen($arquivo->getRealPath(), 'r');
        if (!$handle) {
            throw new \Exception('Não foi possível abrir o arquivo');
        }

        try {
            // Detecta separador
            $primLinha = fgets($handle);
            rewind($handle);
            $separador = $this->detectarSeparador($primLinha);

            // Lê cabeçalho
            $headerRaw = fgetcsv($handle, 0, $separador, '"', '\\');
            if (!$headerRaw) {
                throw new \Exception('Arquivo sem cabeçalho válido');
            }

            // Normaliza cabeçalho (remove BOM, trim, uppercase)
            $header = array_map(function ($h) {
                $v = trim(ltrim($h, "\xEF\xBB\xBF"));
                return mb_strtoupper($this->normalizarTexto($v));
            }, $headerRaw);

            $totalLinhas = 0;
            $lote = [];
            $tamanhoLote = 1000; // Reduzido para evitar "MySQL server has gone away"

            // Processa linhas
            while (($row = fgetcsv($handle, 0, $separador, '"', '\\')) !== false) {
                $totalLinhas++;

                // Mapeia linha do CSV para array associativo
                $dados = $this->mapearLinha($header, $row);

                if (empty($dados)) {
                    continue;
                }

                // Prepara para inserção
                $lote[] = array_merge($dados, [
                    'importacao_id' => $importacaoId,
                    'numero_linha'  => $totalLinhas,
                    'status'        => 'pendente',
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);

                // Insere em lotes de 1000 (reduzido de 10000 para evitar timeout)
                if (count($lote) >= $tamanhoLote) {
                    try {
                        DB::table('raw_candidatos')->insert($lote);
                        \Log::info("Importar: {$totalLinhas} linhas processadas");
                    } catch (\Exception $e) {
                        // Se houver erro de conexão, reconecta e tenta novamente
                        if (strpos($e->getMessage(), 'gone away') !== false) {
                            DB::reconnect();
                            \Log::warning("Reconexão MySQL - linha {$totalLinhas}");
                            DB::table('raw_candidatos')->insert($lote);
                        } else {
                            throw $e;
                        }
                    }
                    $lote = [];
                }
            }

            // Insere último lote
            if (!empty($lote)) {
                try {
                    DB::table('raw_candidatos')->insert($lote);
                } catch (\Exception $e) {
                    if (strpos($e->getMessage(), 'gone away') !== false) {
                        DB::reconnect();
                        \Log::warning("Reconexão MySQL - último lote");
                        DB::table('raw_candidatos')->insert($lote);
                    } else {
                        throw $e;
                    }
                }
            }

            \Log::info("Importação matriz concluída: {$totalLinhas} linhas");

            return [
                'total_linhas' => $totalLinhas,
                'status'       => 'sucesso',
            ];

        } finally {
            fclose($handle);
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * ETAPA 2: Validação da Matriz
     * ═══════════════════════════════════════════════════════════════════════
     */
    public function validarMatriz(int $importacaoId): array
    {
        $registros = DB::table('raw_candidatos')
            ->where('importacao_id', $importacaoId)
            ->where('status', 'pendente')
            ->get();

        $totalErros = 0;
        $errosPorLinha = [];

        foreach ($registros as $linha) {
            $erros = [];

            // ─── Validações essenciais ───
            if (empty($linha->SQ_CANDIDATO) && empty($linha->NR_CANDIDATO)) {
                $erros[] = 'SQ_CANDIDATO ou NR_CANDIDATO obrigatório';
            }

            if (empty($linha->ANO_ELEICAO)) {
                $erros[] = 'ANO_ELEICAO obrigatório';
            }

            if (empty($linha->CD_MUNICIPIO)) {
                $erros[] = 'CD_MUNICIPIO obrigatório';
            }

            if ($linha->NR_ZONA === '' || $linha->NR_ZONA === null) {
                $erros[] = 'NR_ZONA obrigatório';
            }

            // ─── Validações de tipo ───
            if (!empty($linha->ANO_ELEICAO) && !is_numeric($linha->ANO_ELEICAO)) {
                $erros[] = 'ANO_ELEICAO deve ser numérico';
            }

            if (!empty($linha->CD_MUNICIPIO) && !is_numeric($linha->CD_MUNICIPIO)) {
                $erros[] = 'CD_MUNICIPIO deve ser numérico';
            }

            // Se houver erros, marca como erro
            if (!empty($erros)) {
                DB::table('raw_candidatos')
                    ->where('id', $linha->id)
                    ->update([
                        'status' => 'erro',
                        'erros'  => json_encode($erros, JSON_UNESCAPED_UNICODE),
                        'updated_at' => now(),
                    ]);

                $errosPorLinha[$linha->numero_linha] = $erros;
                $totalErros++;
            }
        }

        return [
            'total_erros'     => $totalErros,
            'erros_por_linha' => $errosPorLinha,
        ];
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     * ETAPA 3: raw_candidatos → Tabelas Finais (Transformação + Persistência)
     * ═══════════════════════════════════════════════════════════════════════
     */
    public function processarMatriz(int $importacaoId): array
    {
        $cache = [
            'eleicao'     => [],
            'partido'     => [],
            'municipio'   => [],
            'zona'        => [],
            'cargo'       => [],
            'pessoa'      => [],
            'candidatura' => [],
        ];

        $processados = 0;
        $falhas = 0;

        // ⭐ Cache para agregar votos_municipio (somar votos de todas as zonas)
        $agregacaoMunicipio = [];

        DB::transaction(function () use ($importacaoId, &$cache, &$processados, &$falhas, &$agregacaoMunicipio) {
            // Processa apenas registros com status = 'pendente'
            $registros = DB::table('raw_candidatos')
                ->where('importacao_id', $importacaoId)
                ->where('status', 'pendente')
                ->get();

            foreach ($registros as $raw) {
                try {
                    // 1. Resolver/criar entidades
                    $eleicaoId = $this->resolverEleicao(
                        (int) $raw->ANO_ELEICAO,
                        (int) $raw->CD_ELEICAO,
                        (string) $raw->DS_ELEICAO,
                        (int) $raw->NR_TURNO,
                        (string) $raw->SG_UF,
                        $cache,
                        $importacaoId
                    );

                    $municipioId = $this->resolverMunicipio(
                        (int) $raw->CD_MUNICIPIO,
                        (string) $raw->NM_MUNICIPIO,
                        (string) $raw->SG_UF,
                        $cache,
                        $importacaoId
                    );

                    $zonaId = $this->resolverZona(
                        (string) $raw->NR_ZONA,
                        $municipioId,
                        $cache,
                        $importacaoId
                    );

                    $cargoId = $this->resolverCargo(
                        (string) $raw->CD_CARGO,
                        (string) $raw->DS_CARGO,
                        $cache,
                        $importacaoId
                    );

                    $partidoId = $this->resolverPartido(
                        (int) ($raw->NR_PARTIDO ?? null),
                        (string) $raw->SG_PARTIDO,
                        (string) $raw->NM_PARTIDO,
                        $cache,
                        $importacaoId
                    );

                    $pessoaId = $this->resolverPessoa(
                        (string) $raw->SQ_CANDIDATO,
                        (string) $raw->NM_CANDIDATO,
                        (string) $raw->NM_URNA_CANDIDATO,
                        (string) $raw->NM_SOCIAL_CANDIDATO,
                        $cache,
                        $importacaoId
                    );

                    // Chave para candidatura
                    $chaveCandidatura = $raw->SQ_CANDIDATO . '|' . $eleicaoId;

                    $candidaturaId = $this->resolverCandidatura(
                        $chaveCandidatura,
                        (string) $raw->SQ_CANDIDATO,
                        $pessoaId,
                        $eleicaoId,
                        $cargoId,
                        $partidoId,
                        (string) ($raw->NR_CANDIDATO ?? ''),
                        (string) ($raw->NM_URNA_CANDIDATO ?? ''),
                        (string) ($raw->DS_SIT_TOT_TURNO ?? ''), // ⭐ Situação final!
                        $cache,
                        $importacaoId
                    );

                    // 2. Criar/atualizar votos_zona (agregado por zona)
                    // ⭐ Incluir turno na chave para não sobrescrever turnos anteriores
                    $nrTurno = (int) ($raw->NR_TURNO ?? 1);
                    $totalVotos = (int) ($raw->QT_VOTOS_NOMINAIS_VALIDOS ?? 0);
                    $sitTurno = (string) ($raw->DS_SIT_TOT_TURNO ?? '');

                    DB::table('votos_zona')->updateOrInsert(
                        [
                            'candidatura_id' => $candidaturaId,
                            'zona_id'        => $zonaId,
                            'nr_turno'       => $nrTurno,
                        ],
                        [
                            'eleicao_id'             => $eleicaoId,
                            'cargo_id'               => $cargoId,
                            'nr_turno'               => $nrTurno,
                            'total_votos'            => $totalVotos,
                            'votos_nominais_validos' => (int) ($raw->QT_VOTOS_NOMINAIS_VALIDOS ?? 0),
                            'total_aptos'            => 0,
                            'total_secoes'           => 0,
                            'fonte'                  => 'base',
                            'ds_sit_tot_turno'       => $sitTurno,
                            'importacao_id'          => $importacaoId,
                            'updated_at'             => now(),
                            'created_at'             => now(),
                        ]
                    );

                    // 3. ⭐ NOVO: Agregar votos_municipio (somar votos de TODAS as zonas)
                    // Chave de agregação: candidatura_id:municipio_id:turno
                    $chaveAgregacao = "{$candidaturaId}:{$municipioId}:{$nrTurno}";

                    if (!isset($agregacaoMunicipio[$chaveAgregacao])) {
                        $agregacaoMunicipio[$chaveAgregacao] = [
                            'candidatura_id'   => $candidaturaId,
                            'municipio_id'     => $municipioId,
                            'eleicao_id'       => $eleicaoId,
                            'cargo_id'         => $cargoId,
                            'nr_turno'         => $nrTurno,
                            'total_votos'      => 0,
                            'ds_sit_tot_turno' => $sitTurno,
                            'importacao_id'    => $importacaoId,
                        ];
                    }

                    // Somar votos (pode vir de múltiplas zonas)
                    $agregacaoMunicipio[$chaveAgregacao]['total_votos'] += $totalVotos;

                    // Atualizar situação (a última linha com esse candidato+municipio+turno ganha)
                    if (!empty($sitTurno)) {
                        $agregacaoMunicipio[$chaveAgregacao]['ds_sit_tot_turno'] = $sitTurno;
                    }

                    // 3. Marcar como processado
                    DB::table('raw_candidatos')
                        ->where('id', $raw->id)
                        ->update([
                            'status'     => 'processado',
                            'updated_at' => now(),
                        ]);

                    $processados++;

                } catch (\Throwable $e) {
                    // Registra erro
                    DB::table('raw_candidatos')
                        ->where('id', $raw->id)
                        ->update([
                            'status'     => 'erro',
                            'erros'      => json_encode([$e->getMessage()], JSON_UNESCAPED_UNICODE),
                            'updated_at' => now(),
                        ]);

                    $falhas++;
                }
            }

            // 4. ⭐ Inserir votos_municipio agregados (após processar todas as zonas)
            // Isso garante que cada candidato tem UMA linha por municipio por turno com TODOS os votos somados
            if (!empty($agregacaoMunicipio)) {
                $loteVotosMunicipio = [];

                foreach ($agregacaoMunicipio as $chave => $dados) {
                    $loteVotosMunicipio[] = array_merge($dados, [
                        'total_aptos'          => 0,
                        'total_comparecimento' => 0,
                        'total_abstencoes'     => 0,
                        'total_secoes'         => 0,
                        'created_at'           => now(),
                        'updated_at'           => now(),
                    ]);
                }

                // Insere em lotes para evitar sobrecarga
                $tamanhoLote = 1000;
                for ($i = 0; $i < count($loteVotosMunicipio); $i += $tamanhoLote) {
                    $lote = array_slice($loteVotosMunicipio, $i, $tamanhoLote);

                    // updateOrInsert para evitar duplicatas
                    foreach ($lote as $voto) {
                        DB::table('votos_municipio')->updateOrInsert(
                            [
                                'candidatura_id' => $voto['candidatura_id'],
                                'municipio_id'   => $voto['municipio_id'],
                                'nr_turno'       => $voto['nr_turno'],
                            ],
                            $voto
                        );
                    }
                }

                \Log::info("Votos municipio agregados: " . count($loteVotosMunicipio) . " registros");
            }
        });

        return [
            'processados' => $processados,
            'falhas'      => $falhas,
        ];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RESOLVERS (Auxiliares para criar/buscar entidades)
    // ═══════════════════════════════════════════════════════════════════════

    public function resolverEleicao(int $ano, int $cd_eleicao, string $ds_eleicao, string $turno, string $uf, array &$cache, int $importacaoId): int
    {
        $chave = $ano . '|' . $cd_eleicao . '|' . $uf . '|' . $turno;

        if (isset($cache['eleicao'][$chave])) {
            return $cache['eleicao'][$chave];
        }

        $id = DB::table('eleicoes')
            ->where('cd_eleicao', $cd_eleicao)
            ->value('id');

        $desc = $ds_eleicao . ' - ' . $uf;

        if (!$id) {
            $id = DB::table('eleicoes')->insertGetId([
                'ano'           => $ano,
                'cd_eleicao'    => $cd_eleicao,
                'turno'         => $turno,
                'descricao'     => $desc,
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        } else {
            DB::table('eleicoes')
                ->where('id', $id)
                ->update([
                    'cd_eleicao'    => $cd_eleicao,
                    'descricao'     => $desc,
                    'turno'         => $turno,
                    'importacao_id' => $importacaoId,
                    'updated_at'    => now(),
                ]);
        }

        $cache['eleicao'][$chave] = $id;
        return (int) $id;
    }

    private function resolverMunicipio(int $cdMunicipio, string $nmMunicipio, string $uf, array &$cache, int $importacaoId): int
    {
        $chave = (string) $cdMunicipio;

        if (isset($cache['municipio'][$chave])) {
            return $cache['municipio'][$chave];
        }

        $id = DB::table('municipios')
            ->where('codigo_tse', (string) $cdMunicipio)
            ->value('id');

        if (!$id && !empty($nmMunicipio)) {
            $id = DB::table('municipios')
                ->where('nome', $nmMunicipio)
                ->where('uf', $uf)
                ->value('id');
        }

        if (!$id) {
            $id = DB::table('municipios')->insertGetId([
                'nome'          => $nmMunicipio,
                'uf'            => $uf,
                'codigo_tse'    => (string) $cdMunicipio,
                'latitude'      => null,
                'longitude'     => null,
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        } else {
            DB::table('municipios')
                ->where('id', $id)
                ->update([
                    'nome'          => !empty($nmMunicipio) ? $nmMunicipio : DB::raw('nome'),
                    'uf'            => !empty($uf) ? $uf : DB::raw('uf'),
                    'importacao_id' => $importacaoId,
                    'updated_at'    => now(),
                ]);
        }

        $cache['municipio'][$chave] = $id;
        return (int) $id;
    }

    private function resolverZona(string $nrZona, int $municipioId, array &$cache, int $importacaoId): int
    {
        $chave = $nrZona . '|' . $municipioId;

        if (isset($cache['zona'][$chave])) {
            return $cache['zona'][$chave];
        }

        $id = DB::table('zonas_eleitorais')
            ->where('numero', $nrZona)
            ->where('municipio_id', $municipioId)
            ->value('id');

        if (!$id) {
            $id = DB::table('zonas_eleitorais')->insertGetId([
                'numero'        => $nrZona,
                'municipio_id'  => $municipioId,
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        $cache['zona'][$chave] = $id;
        return (int) $id;
    }

    private function resolverCargo(string $cdCargo, string $dsCargo, array &$cache, int $importacaoId): int
    {
        $chave = !empty($cdCargo) ? $cdCargo : $dsCargo;

        if (isset($cache['cargo'][$chave])) {
            return $cache['cargo'][$chave];
        }

        $desc = !empty($dsCargo) ? $dsCargo : ('Cargo ' . $cdCargo);

        $id = DB::table('cargos')
            ->where('descricao', $desc)
            ->value('id');

        if (!$id) {
            $id = DB::table('cargos')->insertGetId([
                'descricao'     => $desc,
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        $cache['cargo'][$chave] = $id;
        return (int) $id;
    }

    private function resolverPartido(?int $nrPartido, string $sgPartido, string $nmPartido, array &$cache, int $importacaoId): int
    {
        $chave = ($nrPartido ?? 0) . '|' . $sgPartido;

        if (isset($cache['partido'][$chave])) {
            return $cache['partido'][$chave];
        }

        $id = null;

        if (!empty($sgPartido)) {
            $id = DB::table('partidos')
                ->where('sigla', $sgPartido)
                ->value('id');
        }

        if (!$id && $nrPartido !== null) {
            $id = DB::table('partidos')
                ->where('numero', $nrPartido)
                ->value('id');
        }

        if (!$id) {
            $id = DB::table('partidos')->insertGetId([
                'sigla'         => !empty($sgPartido) ? $sgPartido : 'SEM',
                'nome'          => !empty($nmPartido) ? $nmPartido : null,
                'numero'        => $nrPartido,
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        } else {
            DB::table('partidos')
                ->where('id', $id)
                ->update([
                    'nome'          => !empty($nmPartido) ? $nmPartido : DB::raw('nome'),
                    'numero'        => $nrPartido ?? DB::raw('numero'),
                    'importacao_id' => $importacaoId,
                    'updated_at'    => now(),
                ]);
        }

        $cache['partido'][$chave] = $id;
        return (int) $id;
    }

    private function resolverPessoa(string $sqCandidato, string $nmCandidato, string $nmUrna, string $nmSocial, array &$cache, int $importacaoId): int
    {
        if (isset($cache['pessoa'][$sqCandidato])) {
            return $cache['pessoa'][$sqCandidato];
        }

        // Tenta reutilizar pessoa existente
        $id = DB::table('candidaturas')
            ->where('sq_candidato', $sqCandidato)
            ->value('pessoa_id');

        if (!$id) {
            $nome = !empty($nmCandidato) ? $nmCandidato : (!empty($nmUrna) ? $nmUrna : 'CANDIDATO_' . $sqCandidato);

            $id = DB::table('pessoas')->insertGetId([
                'nome'          => $nome,
                'nome_social'   => !empty($nmSocial) ? $nmSocial : null,
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        $cache['pessoa'][$sqCandidato] = $id;
        return (int) $id;
    }

    private function resolverCandidatura(string $chaveCandidatura, string $sqCandidato, int $pessoaId, int $eleicaoId, int $cargoId, int $partidoId, string $nrCandidato, string $nmUrna, string $situacaoTurno, array &$cache, int $importacaoId): int
    {
        if (isset($cache['candidatura'][$chaveCandidatura])) {
            return $cache['candidatura'][$chaveCandidatura];
        }

        $id = DB::table('candidaturas')
            ->where('sq_candidato', $sqCandidato)
            ->where('eleicao_id', $eleicaoId)
            ->value('id');

        if (!$id) {
            $id = DB::table('candidaturas')->insertGetId([
                'sq_candidato'  => $sqCandidato,
                'pessoa_id'     => $pessoaId,
                'eleicao_id'    => $eleicaoId,
                'cargo_id'      => $cargoId,
                'partido_id'    => $partidoId,
                'numero'        => !empty($nrCandidato) ? $nrCandidato : null,
                'nome_urna'     => !empty($nmUrna) ? $nmUrna : null,
                'situacao'      => $situacaoTurno,
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        } else {
            DB::table('candidaturas')
                ->where('id', $id)
                ->update([
                    'partido_id'    => $partidoId,
                    'situacao'      => $situacaoTurno,
                    'importacao_id' => $importacaoId,
                    'updated_at'    => now(),
                ]);
        }

        $cache['candidatura'][$chaveCandidatura] = $id;
        return (int) $id;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITÁRIOS
    // ═══════════════════════════════════════════════════════════════════════

    private function detectarSeparador(string $linha): string
    {
        $separadores = [
            ';' => substr_count($linha, ';'),
            ',' => substr_count($linha, ','),
            "\t" => substr_count($linha, "\t"),
            '|' => substr_count($linha, '|'),
        ];

        arsort($separadores);
        $separador = (string) array_key_first($separadores);

        return ($separadores[$separador] ?? 0) > 0 ? $separador : ';';
    }

    private function mapearLinha(array $header, array $row): array
    {
        if (empty($header)) {
            return [];
        }

        $dados = [];
        $totalCabecalho = count($header);

        // Colunas de data que precisam conversão (DD/MM/YYYY → YYYY-MM-DD)
        $colunasData = ['DT_GERACAO', 'DT_ELEICAO', 'DT_DATA_CANDIDATURA'];

        // Colunas de hora (já vêm em HH:MM:SS, mas validamos)
        $colunasHora = ['HH_GERACAO'];

        for ($i = 0; $i < $totalCabecalho; $i++) {
            $coluna = (string) $header[$i];

            if ($coluna === '') {
                continue;
            }

            $valor = array_key_exists($i, $row) ? (string) $row[$i] : null;
            $valor = $this->normalizarTexto($valor);

            // Converter datas de DD/MM/YYYY para YYYY-MM-DD
            if (in_array($coluna, $colunasData) && !empty($valor)) {
                $valor = $this->converterData($valor);
            }

            // Validar e normalizar horas
            if (in_array($coluna, $colunasHora) && !empty($valor)) {
                $valor = $this->normalizarHora($valor);
            }

            $dados[$coluna] = $valor;
        }

        return $dados;
    }

    private function normalizarTexto(?string $valor): ?string
    {
        if ($valor === null) {
            return null;
        }

        $texto = trim($valor);
        if ($texto === '') {
            return null;
        }

        // Normaliza encoding
        $texto = mb_convert_encoding($texto, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
        $texto = trim($texto);

        // Valores nulos do TSE
        if (in_array($texto, ['#NULO', '#NULO#', '#NE', '#NE#', '-1', '#'], true)) {
            return null;
        }

        return $texto;
    }

    /**
     * Converte data de DD/MM/YYYY para YYYY-MM-DD (formato MySQL)
     */
    private function converterData(string $data): ?string
    {
        if (empty($data)) {
            return null;
        }

        // Tenta diferentes formatos
        $formatos = [
            'd/m/Y',    // 06/10/2024
            'd/m/y',    // 06/10/24
            'd-m-Y',    // 06-10-2024
            'd-m-y',    // 06-10-24
            'Y/m/d',    // 2024/10/06 (já correto)
            'Y-m-d',    // 2024-10-06 (já correto)
        ];

        foreach ($formatos as $formato) {
            $parsed = \DateTime::createFromFormat($formato, $data);
            if ($parsed !== false) {
                return $parsed->format('Y-m-d');
            }
        }

        // Se nenhum formato funcionou, tenta converter como timestamp
        $timestamp = strtotime($data);
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }

        // Se tudo falhar, retorna null
        \Log::warning("Não foi possível converter data: {$data}");
        return null;
    }

    /**
     * Normaliza hora para formato HH:MM:SS
     */
    private function normalizarHora(string $hora): ?string
    {
        if (empty($hora)) {
            return null;
        }

        // Se já está no formato HH:MM:SS, retorna
        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $hora)) {
            return $hora;
        }

        // Tenta parsear e formatar
        $parsed = \DateTime::createFromFormat('H:i:s', $hora);
        if ($parsed !== false) {
            return $parsed->format('H:i:s');
        }

        // Tenta HH:MM
        $parsed = \DateTime::createFromFormat('H:i', $hora);
        if ($parsed !== false) {
            return $parsed->format('H:i:s');
        }

        \Log::warning("Não foi possível converter hora: {$hora}");
        return null;
    }

    /**
     * Reconstrói votos_municipio a partir de votos_zona
     * Agora com suporte a múltiplos turnos
     */
    public function reconstruirVotosMunicipioDaBase(array $eleicaoIds, int $importacaoId): void
    {
        if (empty($eleicaoIds)) return;

        DB::transaction(function () use ($eleicaoIds, $importacaoId) {
            // Remove apenas os votos_municipio das eleições afetadas (base)
            DB::table('votos_municipio')
                ->whereIn('eleicao_id', $eleicaoIds)
                ->delete();

            // ⭐ Agrupar por turno também agora
            DB::insert(
                'INSERT INTO votos_municipio
                    (candidatura_id, municipio_id, eleicao_id, cargo_id,
                     nr_turno, total_votos, total_aptos, total_comparecimento, total_abstencoes,
                     total_secoes, created_at, updated_at, importacao_id)
                 SELECT
                    vz.candidatura_id,
                    ze.municipio_id,
                    vz.eleicao_id,
                    vz.cargo_id,
                    vz.nr_turno,
                    SUM(vz.total_votos),
                    0, 0, 0,
                    COUNT(DISTINCT vz.zona_id),
                    NOW(), NOW(), ?
                 FROM votos_zona vz
                 JOIN zonas_eleitorais ze ON ze.id = vz.zona_id
                 WHERE vz.fonte = \'base\'
                   AND vz.eleicao_id IN (' . implode(',', array_fill(0, count($eleicaoIds), '?')) . ')
                 GROUP BY vz.candidatura_id, ze.municipio_id, vz.eleicao_id, vz.cargo_id, vz.nr_turno',
                array_merge([$importacaoId], $eleicaoIds)
            );
        });
    }
}
