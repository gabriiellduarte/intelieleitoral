<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('redes_sociais_pessoa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('plataforma', 40); // instagram, facebook, twitter, youtube, tiktok, etc.
            $table->string('url')->nullable();
            $table->string('handle', 100)->nullable(); // @usuario
            $table->timestamps();

            $table->unique(['pessoa_id', 'plataforma']);
            $table->index('pessoa_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('redes_sociais_pessoa');
    }
};
