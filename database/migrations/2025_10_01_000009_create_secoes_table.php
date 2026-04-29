<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('secoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zona_id')->constrained('zonas_eleitorais')->cascadeOnDelete();
            $table->foreignId('local_votacao_id')->nullable()->constrained('locais_votacao')->nullOnDelete();
            $table->string('numero', 10);
            $table->timestamps();

            $table->unique(['zona_id', 'numero']);
            $table->index('zona_id');
            $table->index('local_votacao_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('secoes');
    }
};
