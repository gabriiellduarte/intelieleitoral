<?php

namespace App\Http\Controllers;

use App\Models\PagamentoAssinatura;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Recebe e processa os eventos de webhook enviados pelo Asaas.
 *
 * Validação de segurança: o Asaas envia o cabeçalho `asaas-access-token`
 * com o token configurado em ASAAS_WEBHOOK_TOKEN. Qualquer requisição sem
 * o token correto é rejeitada com 401.
 *
 * Idempotência: todos os registros em pagamentos_assinaturas são criados
 * via `PagamentoAssinatura::registrarIdempotente()`, que usa `updateOrCreate`,
 * portanto reenvios do mesmo evento não causam duplicatas.
 */
class WebhookAsaasController extends Controller
{
    /**
     * Mapa de eventos do Asaas para o status interno do pagamento.
     */
    private const STATUS_PAGAMENTO = [
        'PAYMENT_CONFIRMED' => 'pago',
        'PAYMENT_RECEIVED'  => 'pago',
        'PAYMENT_OVERDUE'   => 'inadimplente',
        'PAYMENT_DELETED'   => 'cancelado',
    ];

    /**
     * Mapa de billingType do Asaas para descrição legível em português.
     */
    private const METODO_PAGAMENTO = [
        'CREDIT_CARD' => 'Cartão de crédito',
        'BOLETO'      => 'Boleto bancário',
        'PIX'         => 'Pix',
        'DEBIT_CARD'  => 'Cartão de débito',
        'UNDEFINED'   => 'Não definido',
    ];

    /**
     * Ponto de entrada único para todos os eventos do Asaas.
     */
    public function handle(Request $request): JsonResponse
    {
        // Valida o token de segurança antes de qualquer processamento
        if (! $this->tokenValido($request)) {
            Log::channel('stack')->warning('[Webhook Asaas] Token inválido', [
                'ip' => $request->ip(),
            ]);

            return response()->json(['message' => 'Não autorizado.'], 401);
        }

        $evento = $request->input('event');
        $dados  = $request->input('payment', []);

        Log::channel('stack')->info("[Webhook Asaas] Evento recebido: {$evento}", [
            'pagamento_id' => $dados['id'] ?? null,
        ]);

        return match ($evento) {
            'PAYMENT_CONFIRMED',
            'PAYMENT_RECEIVED'   => $this->processarPagamentoConfirmado($dados),

            'PAYMENT_OVERDUE'    => $this->processarPagamentoVencido($dados),

            'PAYMENT_DELETED'    => $this->processarPagamentoCancelado($dados),

            'SUBSCRIPTION_RENEWED',
            'SUBSCRIPTION_DELETED' => $this->processarEventoAssinatura($evento, $dados),

            default => response()->json(['message' => 'Evento ignorado.'], 200),
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Handlers de evento
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Cobrança confirmada/recebida → registra pagamento e ativa o cliente.
     */
    private function processarPagamentoConfirmado(array $dados): JsonResponse
    {
        $cliente = $this->encontrarClientePorAssinatura($dados['subscription'] ?? null);

        if (! $cliente) {
            return response()->json(['message' => 'Cliente não encontrado.'], 200);
        }

        // Registra (ou atualiza se já existir) o pagamento de forma idempotente
        PagamentoAssinatura::registrarIdempotente([
            'cliente_id'        => $cliente->id,
            'plano_id'          => $cliente->plano_id,
            'valor'             => (float) ($dados['value'] ?? 0),
            'moeda'             => 'BRL',
            'status'            => 'pago',
            'metodo_pagamento'  => self::METODO_PAGAMENTO[$dados['billingType'] ?? ''] ?? null,
            'referencia_externa'=> $dados['id'],
            'pago_em'           => $dados['confirmedDate'] ?? $dados['paymentDate'] ?? null,
        ]);

        // Ativa o cliente e recalcula a data de renovação (30 dias a partir de hoje)
        $cliente->update([
            'ativo'                   => true,
            'assinatura_asaas_status' => 'ativa',
            'assinatura_renova_em'    => now()->addDays(30),
        ]);

        return response()->json(['message' => 'Pagamento confirmado processado.']);
    }

    /**
     * Cobrança vencida → marca o cliente como inadimplente sem bloquear imediatamente.
     */
    private function processarPagamentoVencido(array $dados): JsonResponse
    {
        $cliente = $this->encontrarClientePorAssinatura($dados['subscription'] ?? null);

        if (! $cliente) {
            return response()->json(['message' => 'Cliente não encontrado.'], 200);
        }

        // Registra o evento de inadimplência para histórico
        PagamentoAssinatura::registrarIdempotente([
            'cliente_id'         => $cliente->id,
            'plano_id'           => $cliente->plano_id,
            'valor'              => (float) ($dados['value'] ?? 0),
            'moeda'              => 'BRL',
            'status'             => 'inadimplente',
            'metodo_pagamento'   => self::METODO_PAGAMENTO[$dados['billingType'] ?? ''] ?? null,
            'referencia_externa' => $dados['id'],
            'pago_em'            => null,
        ]);

        $cliente->update([
            'assinatura_asaas_status' => 'inadimplente',
        ]);

        return response()->json(['message' => 'Evento de inadimplência processado.']);
    }

    /**
     * Cobrança deletada → marca como cancelada no histórico.
     */
    private function processarPagamentoCancelado(array $dados): JsonResponse
    {
        // Apenas atualiza o status do registro existente, se houver
        PagamentoAssinatura::where('referencia_externa', $dados['id'])
            ->update(['status' => 'cancelado']);

        return response()->json(['message' => 'Pagamento cancelado processado.']);
    }

    /**
     * Eventos ligados à assinatura em si (renovação ou exclusão).
     */
    private function processarEventoAssinatura(string $evento, array $dados): JsonResponse
    {
        // O payload de assinatura chega em 'subscription', não em 'payment'
        $assinaturaId = $dados['id'] ?? null;

        if (! $assinaturaId) {
            return response()->json(['message' => 'ID de assinatura ausente.'], 200);
        }

        $cliente = User::where('asaas_assinatura_id', $assinaturaId)->first();

        if (! $cliente) {
            return response()->json(['message' => 'Cliente não encontrado.'], 200);
        }

        if ($evento === 'SUBSCRIPTION_RENEWED') {
            // Assinatura renovada → recalcula data de renovação
            $cliente->update([
                'assinatura_asaas_status' => 'ativa',
                'assinatura_renova_em'    => now()->addDays(30),
            ]);
        }

        if ($evento === 'SUBSCRIPTION_DELETED') {
            // Assinatura encerrada pelo Asaas → agenda cancelamento no fim do ciclo
            $cliente->update([
                'assinatura_cancelar_no_fim_ciclo' => true,
                'assinatura_asaas_status'          => 'cancelada',
            ]);
        }

        return response()->json(['message' => "Evento {$evento} processado."]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Auxiliares
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Verifica se o token enviado pelo Asaas bate com o configurado localmente.
     *
     * O Asaas envia o token no cabeçalho `asaas-access-token`.
     */
    private function tokenValido(Request $request): bool
    {
        $tokenEsperado = config('services.asaas.webhook_token');

        // Se nenhum token for configurado, rejeita por segurança
        if (empty($tokenEsperado)) {
            Log::channel('stack')->error('[Webhook Asaas] ASAAS_WEBHOOK_TOKEN não configurado!');
            return false;
        }

        return hash_equals($tokenEsperado, (string) $request->header('asaas-access-token', ''));
    }

    /**
     * Localiza o User (cliente) a partir do ID de assinatura do Asaas.
     *
     * @param  string|null  $assinaturaId  ID da assinatura vindo do payload
     */
    private function encontrarClientePorAssinatura(?string $assinaturaId): ?User
    {
        if (! $assinaturaId) {
            return null;
        }

        return User::where('asaas_assinatura_id', $assinaturaId)->first();
    }
}
