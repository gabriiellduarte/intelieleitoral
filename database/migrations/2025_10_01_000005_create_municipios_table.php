<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('municipios', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('nome_tse')->nullable();       // NM_MUNICIPIO_TSE (pode divergir do IBGE)
            $table->string('uf', 2)->nullable();
            $table->string('nm_uf')->nullable();          // NM_UF — nome completo do estado
            $table->string('codigo_ibge', 10)->nullable()->unique();
            $table->string('codigo_tse', 10)->nullable()->unique();
            $table->decimal('latitude',  10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();

            $table->index('nome');
            $table->index('uf');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('municipios');
    }
};
