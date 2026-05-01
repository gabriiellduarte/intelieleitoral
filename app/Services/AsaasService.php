<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Serviço responsável por toda comunicação com a API do Asaas.
 *
 * Centraliza autenticação, timeout, retry e log de erros,
 * evitando repetição de configuração em controllers/jobs.
 */
class AsaasService
{
    // Prefixo usado nos logs para facilitar filtragem
    private const LOG_CHANNEL = 'asaas';

    // Número máximo de tentativas automáticas em falha de rede/timeout
    private const MAX_TENTATIVAS = 3;

    // Intervalo entre tentativas (milissegundos)
    private const INTERVALO_RETRY_MS = 500;

    private string $baseUrl;
    private string $apiKey;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.asaas.base_url'), '/');
        $this->apiKey  = (string) config('services.asaas.api_key');
        $this->timeout = (int) config('services.asaas.timeout', 15);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Clientes
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Cria um cliente no Asaas com os dados mínimos necessários.
     *
     * @param  array{nome: string, email: string, cpf_cnpj?: string, telefone?: string}  $dados
     * @return array  Resposta decodificada da API
     */
    public function criarCliente(array $dados): array
    {
        $corpo = array_filter([
            'name'          => $dados['nome'],
            'email'         => $dados['email'],
            'cpfCnpj'       => $dados['cpf_cnpj'] ?? null,
            'mobilePhone'   => $dados['telefone'] ?? null,
            'notificationDisabledByCustomer' => false,
        ]);

        return $this->post('/customers', $corpo);
    }

    /**
     * Atualiza dados cadastrais de um cliente existente no Asaas.
     */
    public function atualizarCliente(string $asaasClienteId, array $dados): array
    {
        $corpo = array_filter([
            'name'          => $dados['nome'] ?? null,
            'email'         => $dados['email'] ?? null,
            'cpfCnpj'       => $dados['cpf_cnpj'] ?? null,
            'mobilePhone'   => $dados['telefone'] ?? null,
        ]);

        return $this->post("/customers/{$asaasClienteId}", $corpo);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Assinaturas (recorrências)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Cria uma assinatura recorrente mensal com cartão de crédito.
     *
     * @param  array{
     *     asaas_cliente_id: string,
     *     valor: float,
     *     descricao?: string,
     *     proximo_vencimento?: string,
     *     numero_cartao: string,
     *     expiry_mes: string,
     *     expiry_ano: string,
     *     cvv: string,
     *     titular_cartao: string,
     *     titular_cpf_cnpj: string,
     *     titular_email: string,
     *     titular_telefone?: string,
     *     titular_cep?: string,
     *     titular_numero_endereco?: string
     * }  $dados
     */
    public function criarAssinaturaCartao(array $dados): array
    {
        $corpo = [
            'customer'          => $dados['asaas_cliente_id'],
            'billingType'       => 'CREDIT_CARD',
            'cycle'             => 'MONTHLY',
            'value'             => $dados['valor'],
            'nextDueDate'       => $dados['proximo_vencimento'] ?? now()->toDateString(),
            'description'       => $dados['descricao'] ?? 'Assinatura mensal',
            'creditCard'        => [
                'holderName'   => $dados['titular_cartao'],
                'number'       => $dados['numero_cartao'],
                'expiryMonth'  => $dados['expiry_mes'],
                'expiryYear'   => $dados['expiry_ano'],
                'ccv'          => $dados['cvv'],
            ],
            'creditCardHolderInfo' => array_filter([
                'name'              => $dados['titular_cartao'],
                'email'             => $dados['titular_email'],
                'cpfCnpj'           => $dados['titular_cpf_cnpj'],
                'mobilePhone'       => $dados['titular_telefone'] ?? null,
                'postalCode'        => $dados['titular_cep'] ?? null,
                'addressNumber'     => $dados['titular_numero_endereco'] ?? null,
            ]),
        ];

        return $this->post('/subscriptions', $corpo);
    }

    /**
     * Cancela uma assinatura no Asaas (sem reembolso).
     */
    public function cancelarAssinatura(string $asaasAssinaturaId): array
    {
        return $this->delete("/subscriptions/{$asaasAssinaturaId}");
    }

    /**
     * Recupera dados completos de uma assinatura do Asaas.
     */
    public function obterAssinatura(string $asaasAssinaturaId): array
    {
        return $this->get("/subscriptions/{$asaasAssinaturaId}");
    }

    /**
     * Lista as cobranças de uma assinatura (para histórico/reconciliação).
     */
    public function listarCobrancasAssinatura(string $asaasAssinaturaId): array
    {
        return $this->get("/subscriptions/{$asaasAssinaturaId}/payments");
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HTTP interno — todos os requests passam por aqui
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Executa um GET com retry automático.
     */
    private function get(string $endpoint, array $query = []): array
    {
        return $this->executar('GET', $endpoint, $query);
    }

    /**
     * Executa um POST com retry automático.
     */
    private function post(string $endpoint, array $corpo = []): array
    {
        return $this->executar('POST', $endpoint, $corpo);
    }

    /**
     * Executa um DELETE com retry automático.
     */
    private function delete(string $endpoint): array
    {
        return $this->executar('DELETE', $endpoint);
    }

    /**
     * Executa a requisição HTTP com retry em falhas de rede/timeout.
     *
     * Lança \RuntimeException em caso de erro HTTP ou falha definitiva.
     */
    private function executar(string $metodo, string $endpoint, array $dados = []): array
    {
        $url = $this->baseUrl . $endpoint;

        $tentativa = 0;
        $ultimaExcecao = null;

        while ($tentativa < self::MAX_TENTATIVAS) {
            $tentativa++;

            try {
                $cliente = Http::withHeaders([
                    'access_token' => $this->apiKey,
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ])->timeout($this->timeout);

                $resposta = match (strtoupper($metodo)) {
                    'GET'    => $cliente->get($url, $dados),
                    'POST'   => $cliente->post($url, $dados),
                    'PUT'    => $cliente->put($url, $dados),
                    'DELETE' => $cliente->delete($url),
                    default  => throw new \InvalidArgumentException("Método HTTP inválido: {$metodo}"),
                };

                // Erros de negócio (4xx/5xx) registramos e lançamos imediatamente — sem retry
                if ($resposta->clientError()) {
                    $this->registrarErro($metodo, $url, $resposta);
                    throw new \RuntimeException(
                        "Asaas API erro {$resposta->status()}: " . $resposta->body(),
                        $resposta->status()
                    );
                }

                // Erros de servidor (5xx) ou timeouts: faz retry
                if ($resposta->serverError()) {
                    throw new \RuntimeException("Asaas API erro servidor {$resposta->status()}");
                }

                return $resposta->json() ?? [];

            } catch (\Illuminate\Http\Client\ConnectionException $e) {
                // Falha de conexão/timeout: tenta novamente
                $ultimaExcecao = $e;
                Log::channel('stack')->warning("[Asaas] Falha de conexão (tentativa {$tentativa}/{MAX}): {$e->getMessage()}", [
                    'metodo'   => $metodo,
                    'url'      => $url,
                ]);
            } catch (\RuntimeException $e) {
                // Erro de servidor (5xx): tenta novamente
                if ($tentativa < self::MAX_TENTATIVAS) {
                    $ultimaExcecao = $e;
                    usleep(self::INTERVALO_RETRY_MS * 1000 * $tentativa);
                    continue;
                }
                throw $e;
            }

            // Aguarda entre tentativas com backoff simples
            if ($tentativa < self::MAX_TENTATIVAS) {
                usleep(self::INTERVALO_RETRY_MS * 1000 * $tentativa);
            }
        }

        throw new \RuntimeException(
            "[Asaas] Falha definitiva após " . self::MAX_TENTATIVAS . " tentativas: {$ultimaExcecao?->getMessage()}"
        );
    }

    /**
     * Registra detalhes de erros de negócio para auditoria.
     */
    private function registrarErro(string $metodo, string $url, Response $resposta): void
    {
        Log::channel('stack')->error('[Asaas] Erro de negócio', [
            'metodo'   => $metodo,
            'url'      => $url,
            'status'   => $resposta->status(),
            'resposta' => $resposta->body(),
        ]);
    }
}
