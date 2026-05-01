<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('cliente_principal_id')
                ->nullable()
                ->after('plano_id')
                ->constrained('users')
                ->nullOnDelete();

            $table->string('cargo')
                ->default('usuario')
                ->after('cliente_principal_id');

            $table->timestamp('ultimo_acesso')
                ->nullable()
                ->after('cargo');

            $table->index('cliente_principal_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['cliente_principal_id']);
            $table->dropConstrainedForeignId('cliente_principal_id');
            $table->dropColumn(['cargo', 'ultimo_acesso']);
        });
    }
};
