<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ImportadorSecaoService
{
    /**
     * ═══════════════════════════════════════════════════════════════════
     * ETAPA 1: CSV → raw_secoes (Cópia Bruta, sem transformação)
     * ═══════════════════════════════════════════════════════════════════
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
            $tamanhoLote = 1000;

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

                // Insere em lotes de 1000
                if (count($lote) >= $tamanhoLote) {
                    try {
                        DB::table('raw_secoes')->insert($lote);
                        Log::info("Importar seções: {$totalLinhas} linhas processadas");
                    } catch (\Exception $e) {
                        if (strpos($e->getMessage(), 'gone away') !== false) {
                            DB::reconnect();
                            Log::warning("Reconexão MySQL - linha {$totalLinhas}");
                            DB::table('raw_secoes')->insert($lote);
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
                    DB::table('raw_secoes')->insert($lote);
                } catch (\Exception $e) {
                    if (strpos($e->getMessage(), 'gone away') !== false) {
                        DB::reconnect();
                        Log::warning("Reconexão MySQL - último lote seções");
                        DB::table('raw_secoes')->insert($lote);
                    } else {
                        throw $e;
                    }
                }
            }

            Log::info("Importação matriz seções concluída: {$totalLinhas} linhas");

            return [
                'total_linhas' => $totalLinhas,
                'status'       => 'sucesso',
            ];

        } finally {
            fclose($handle);
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════
     * ETAPA 2: Validação da Matriz
     * ═══════════════════════════════════════════════════════════════════
     */
    public function validarMatriz(int $importacaoId): array
    {
        $registros = DB::table('raw_secoes')
            ->where('importacao_id', $importacaoId)
            ->where('status', 'pendente')
            ->get();

        $totalErros = 0;
        $errosPorLinha = [];

        foreach ($registros as $linha) {
            $erros = [];

            // ─── Validações essenciais ───
            if (empty($linha->ANO_ELEICAO)) {
                $erros[] = 'ANO_ELEICAO obrigatório';
            }

            if (empty($linha->CD_ELEICAO)) {
                $erros[] = 'CD_ELEICAO obrigatório';
            }

            if (empty($linha->CD_MUNICIPIO)) {
                $erros[] = 'CD_MUNICIPIO obrigatório';
            }

            if ($linha->NR_ZONA === '' || $linha->NR_ZONA === null) {
                $erros[] = 'NR_ZONA obrigatório';
            }

            if ($linha->NR_SECAO === '' || $linha->NR_SECAO === null) {
                $erros[] = 'NR_SECAO obrigatório';
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
                DB::table('raw_secoes')
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
     * ═══════════════════════════════════════════════════════════════════
     * ETAPA 3: raw_secoes → Tabelas Finais (Transformação + Persistência)
     * ═══════════════════════════════════════════════════════════════════
     */
    public function processarMatriz(int $importacaoId): array
    {
        $cache = [
            'eleicao'     => [],
            'municipio'   => [],
            'zona'        => [],
            'cargo'       => [],
            'partido'     => [],
            'pessoa'      => [],
            'candidatura' => [],
            'local_votacao' => [],
        ];

        $processados = 0;
        $falhas = 0;

        DB::transaction(function () use ($importacaoId, &$cache, &$processados, &$falhas) {
            // Processa apenas registros com status = 'pendente'
            $registros = DB::table('raw_secoes')
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
                        (string) $raw->NR_TURNO,
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
                        (string) $raw->CD_CARGO_PERGUNTA,
                        (string) $raw->DS_CARGO_PERGUNTA,
                        $cache,
                        $importacaoId
                    );

                    // Se houver candidato, resolver
                    $candidaturaId = null;
                    if (!in_array($raw->NR_VOTAVEL, [95, 96, 97])) {
                        $candidaturaId = $this->resolverCandidatura(
                            (int) $raw->NR_VOTAVEL,
                            (int) $raw->CD_ELEICAO,
                            $cache,
                            $importacaoId
                        );
                    }
                    

                    // Resolver partido se houver
                    $partidoId = null;
                    if (!empty($raw->NR_PARTIDO)) {
                        $partidoId = $this->resolverPartido(
                            (int) $raw->NR_PARTIDO,
                            (string) $raw->SG_PARTIDO,
                            (string) $raw->NM_PARTIDO,
                            $cache,
                            $importacaoId
                        );
                    }

                    // Resolver local de votação
                    $localVotacaoId = $this->resolverLocalVotacao(
                        (int) $raw->NR_LOCAL_VOTACAO,
                        (string) $raw->NM_LOCAL_VOTACAO,
                        (string) $raw->DS_LOCAL_VOTACAO_ENDERECO,
                        $zonaId,
                        $municipioId,
                        $cache,
                        $importacaoId
                    );

                    // 2. Inserir votos_secao
                    DB::table('votos_secao')->updateOrInsert(
                        [
                            'eleicao_id'     => $eleicaoId,
                            'municipio_id'   => $municipioId,
                            'zona_id'        => $zonaId,
                            'secao_numero'   => (int) $raw->NR_SECAO,
                            'cargo_id'       => $cargoId,
                            'nr_votavel'     => (int) ($raw->NR_VOTAVEL ?? 0),
                        ],
                        [
                            'candidatura_id'   => $candidaturaId,
                            'partido_id'       => $partidoId,
                            'local_votacao_id' => $localVotacaoId,
                            'nr_turno'         => (int) ($raw->NR_TURNO ?? 1),
                            'tipo_votavel'     => (string) $raw->DS_TIPO_VOTAVEL,
                            'nome_votavel'     => (string) $raw->NM_VOTAVEL,
                            'quantidade_votos' => (int) ($raw->QT_VOTOS ?? 0),
                            'aptos'            => (int) ($raw->QT_APTOS ?? 0),
                            'comparecimento'   => (int) ($raw->QT_COMPARECIMENTO ?? 0),
                            'abstencoes'       => (int) ($raw->QT_ABSTENCOES ?? 0),
                            'importacao_id'    => $importacaoId,
                            'updated_at'       => now(),
                            'created_at'       => now(),
                        ]
                    );

                    // 3. Marcar como processado
                    DB::table('raw_secoes')
                        ->where('id', $raw->id)
                        ->update([
                            'status'     => 'processado',
                            'updated_at' => now(),
                        ]);

                    $processados++;

                } catch (\Throwable $e) {
                    // Registra erro
                    DB::table('raw_secoes')
                        ->where('id', $raw->id)
                        ->update([
                            'status'     => 'erro',
                            'erros'      => json_encode([$e->getMessage()], JSON_UNESCAPED_UNICODE),
                            'updated_at' => now(),
                        ]);

                    Log::error("Erro ao processar seção linha {$raw->numero_linha}: {$e->getMessage()}");
                    $falhas++;
                }
            }
        });

        return [
            'processados' => $processados,
            'falhas'      => $falhas,
        ];
    }

    // ═══════════════════════════════════════════════════════════════════
    // RESOLVERS (Auxiliares para criar/buscar entidades)
    // ═══════════════════════════════════════════════════════════════════

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
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
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

    private function resolverCandidatura(int $nrVotavel, int $cdEleicao, array &$cache, int $importacaoId)
    {
        $chave = $nrVotavel . '|' . $cdEleicao;

        if (isset($cache['candidatura'][$chave])) {
            return $cache['candidatura'][$chave];
        }

        $id = DB::table('candidaturas')
            ->where('numero', $nrVotavel)
            ->join('eleicoes', 'eleicoes.id', '=', 'candidaturas.eleicao_id')
            ->where('eleicoes.cd_eleicao', $cdEleicao)
            ->value('candidaturas.id');


        $cache['candidatura'][$chave] = $id;
        
        return $id;
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
        }

        $cache['partido'][$chave] = $id;
        return (int) $id;
    }

    private function resolverLocalVotacao(int $nrLocal, string $nmLocal, string $dsEndereco, int $zonaId, int $municipioId, array &$cache, int $importacaoId): int
    {
        $chave = $nrLocal . '|' . $zonaId;

        if (isset($cache['local_votacao'][$chave])) {
            return $cache['local_votacao'][$chave];
        }

        $id = DB::table('locais_votacao')
            ->where('numero', $nrLocal)
            ->where('zona_id', $zonaId)
            ->value('id');

        if (!$id) {
            $id = DB::table('locais_votacao')->insertGetId([
                'numero'        => $nrLocal,
                'nome'          => $nmLocal,
                'municipio_id'  => $municipioId,
                'endereco'      => $dsEndereco,
                'zona_id'       => $zonaId,
                'importacao_id' => $importacaoId,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        $cache['local_votacao'][$chave] = $id;
        return (int) $id;
    }

    // ═══════════════════════════════════════════════════════════════════
    // UTILITÁRIOS
    // ═══════════════════════════════════════════════════════════════════

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

        $colunasData = ['DT_GERACAO', 'DT_PLEITO', 'DT_ELEICAO', 'DT_BU_RECEBIDO', 'DT_ABERTURA', 'DT_ENCERRAMENTO', 'DT_CARGA_URNA_EFETIVADA', 'DT_EMISSAO_BU', 'DT_RECEBIMENTO_BU_HOR_TSE', 'DT_PRIM_TOT_PARCIAL_HOR_TSE'];
        $colunasHora = ['HH_GERACAO'];
        $colunasDateTime = ['DT_CARGA_URNA_EFETIVADA', 'DT_ABERTURA', 'DT_ENCERRAMENTO', 'DT_EMISSAO_BU', 'DT_RECEBIMENTO_BU_HOR_TSE', 'DT_PRIM_TOT_PARCIAL_HOR_TSE'];

        for ($i = 0; $i < $totalCabecalho; $i++) {
            $coluna = (string) $header[$i];

            if ($coluna === '') {
                continue;
            }

            $valor = array_key_exists($i, $row) ? (string) $row[$i] : null;
            $valor = $this->normalizarTexto($valor);

            if (in_array($coluna, $colunasData) && !empty($valor) && !in_array($coluna, $colunasDateTime)) {
                $valor = $this->converterData($valor);
            }

            if (in_array($coluna, $colunasHora) && !empty($valor)) {
                $valor = $this->normalizarHora($valor);
            }

            if (in_array($coluna, $colunasDateTime) && !empty($valor)) {
                $valor = $this->converterDataHora($valor);
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

        $texto = mb_convert_encoding($texto, 'UTF-8', 'UTF-8, ISO-8859-1, Windows-1252');
        $texto = trim($texto);

        if (in_array($texto, ['#NULO', '#NULO#', '#NE', '#NE#', '-1', '#'], true)) {
            return null;
        }

        return $texto;
    }

    private function converterData(string $data): ?string
    {
        if (empty($data)) {
            return null;
        }

        $formatos = ['d/m/Y', 'd/m/y', 'd-m-Y', 'd-m-y', 'Y/m/d', 'Y-m-d'];

        foreach ($formatos as $formato) {
            $parsed = \DateTime::createFromFormat($formato, $data);
            if ($parsed !== false) {
                return $parsed->format('Y-m-d');
            }
        }

        $timestamp = strtotime($data);
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }

        Log::warning("Não foi possível converter data: {$data}");
        return null;
    }

    private function converterDataHora(string $dataHora): ?string
    {
        if (empty($dataHora)) {
            return null;
        }

        // Tenta formatos com data e hora
        $formatos = [
            'd/m/Y H:i:s',
            'd/m/Y H:i',
            'Y-m-d H:i:s',
            'Y-m-d H:i',
        ];

        foreach ($formatos as $formato) {
            $parsed = \DateTime::createFromFormat($formato, $dataHora);
            if ($parsed !== false) {
                return $parsed->format('Y-m-d H:i:s');
            }
        }

        // Fallback: trata como data
        $data = $this->converterData($dataHora);
        return $data ? $data . ' 00:00:00' : null;
    }

    private function normalizarHora(string $hora): ?string
    {
        if (empty($hora)) {
            return null;
        }

        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $hora)) {
            return $hora;
        }

        $parsed = \DateTime::createFromFormat('H:i:s', $hora);
        if ($parsed !== false) {
            return $parsed->format('H:i:s');
        }

        $parsed = \DateTime::createFromFormat('H:i', $hora);
        if ($parsed !== false) {
            return $parsed->format('H:i:s');
        }

        Log::warning("Não foi possível converter hora: {$hora}");
        return null;
    }
}
