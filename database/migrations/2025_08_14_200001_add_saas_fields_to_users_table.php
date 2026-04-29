<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('cliente')->after('email'); // admin_saas | cliente
            $table->string('empresa')->nullable()->after('role');
            $table->string('telefone')->nullable()->after('empresa');
            $table->foreignId('plano_id')->nullable()->constrained('planos')->nullOnDelete()->after('telefone');
            $table->boolean('ativo')->default(true)->after('plano_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plano_id');
            $table->dropColumn(['role', 'empresa', 'telefone', 'ativo']);
        });
    }
};
