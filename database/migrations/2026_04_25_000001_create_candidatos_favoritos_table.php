<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidatos_favoritos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cliente_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('candidatura_id')->constrained('candidaturas')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['cliente_id', 'candidatura_id']);
            $table->index('candidatura_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidatos_favoritos');
    }
};
