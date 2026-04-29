<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zonas_eleitorais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('municipio_id')->constrained('municipios')->cascadeOnDelete();
            $table->string('numero', 10);
            $table->string('nome')->nullable();
            $table->timestamps();

            $table->unique(['municipio_id', 'numero']);
            $table->index('municipio_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zonas_eleitorais');
    }
};
