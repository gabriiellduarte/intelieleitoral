<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoas', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('nome_social')->nullable();
            $table->string('cpf', 14)->nullable()->unique();
            $table->date('data_nascimento')->nullable();
            $table->string('titulo_eleitoral', 20)->nullable()->unique();
            $table->string('email')->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('genero', 30)->nullable();
            $table->string('grau_instrucao', 60)->nullable();
            $table->string('ocupacao', 60)->nullable();
            $table->string('naturalidade')->nullable();
            $table->string('nacionalidade', 30)->nullable();
            $table->string('foto_url')->nullable();
            $table->timestamps();

            $table->index('nome');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoas');
    }
};
