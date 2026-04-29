<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('perfil_pessoa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pessoa_id')->unique()->constrained('pessoas')->cascadeOnDelete();
            $table->text('biografia')->nullable();
            $table->string('website')->nullable();
            $table->string('foto_url')->nullable();
            $table->string('cor_raca', 40)->nullable();
            $table->string('estado_civil', 40)->nullable();
            $table->string('municipio_nascimento')->nullable();
            $table->string('uf_nascimento', 2)->nullable();
            $table->string('email_contato')->nullable();
            $table->string('telefone_contato', 20)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perfil_pessoa');
    }
};
