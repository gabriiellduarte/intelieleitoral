<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // ID do cliente no Asaas, usado para criar/gerenciar cobranças e assinaturas
            $table->string('asaas_cliente_id')->nullable()->unique()->after('assinatura_cancelar_no_fim_ciclo');

            // ID da assinatura recorrente no Asaas
            $table->string('asaas_assinatura_id')->nullable()->unique()->after('asaas_cliente_id');

            // Status espelhado do Asaas: 'ativa', 'pendente', 'inadimplente', 'cancelada', 'encerrada'
            $table->string('assinatura_asaas_status', 30)->nullable()->after('asaas_assinatura_id');

            $table->index('asaas_cliente_id');
            $table->index('asaas_assinatura_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['asaas_cliente_id']);
            $table->dropIndex(['asaas_assinatura_id']);
            $table->dropColumn(['asaas_cliente_id', 'asaas_assinatura_id', 'assinatura_asaas_status']);
        });
    }
};
