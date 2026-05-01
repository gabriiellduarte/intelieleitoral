<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('assinatura_renova_em')->nullable()->after('ativo');
            $table->timestamp('assinatura_cancelada_em')->nullable()->after('assinatura_renova_em');
            $table->boolean('assinatura_cancelar_no_fim_ciclo')->default(false)->after('assinatura_cancelada_em');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'assinatura_renova_em',
                'assinatura_cancelada_em',
                'assinatura_cancelar_no_fim_ciclo',
            ]);
        });
    }
};
