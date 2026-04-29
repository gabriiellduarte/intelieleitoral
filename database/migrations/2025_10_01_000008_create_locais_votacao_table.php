<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locais_votacao', function (Blueprint $table) {
            $table->id();
            $table->foreignId('municipio_id')->constrained('municipios')->cascadeOnDelete();
            $table->foreignId('zona_id')->nullable()->constrained('zonas_eleitorais')->nullOnDelete();
            $table->string('numero', 10)->nullable();
            $table->string('nome')->nullable();
            $table->string('endereco')->nullable();
            $table->string('bairro')->nullable();
            $table->string('cep', 10)->nullable();
            $table->decimal('latitude',  10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();

            $table->index('municipio_id');
            $table->index('zona_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locais_votacao');
    }
};
