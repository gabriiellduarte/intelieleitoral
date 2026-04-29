<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locais_votacao', function (Blueprint $table) {
            if (!Schema::hasColumn('locais_votacao', 'importacao_id')) {
                $table->foreignId('importacao_id')
                    ->nullable()
                    ->constrained('importacoes')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('locais_votacao', function (Blueprint $table) {
            if (Schema::hasColumn('locais_votacao', 'importacao_id')) {
                $table->dropConstrainedForeignId('importacao_id');
            }
        });
    }
};
