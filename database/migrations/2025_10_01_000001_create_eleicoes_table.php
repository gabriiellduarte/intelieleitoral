<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eleicoes', function (Blueprint $table) {
            $table->id();
            $table->smallInteger('ano');
            $table->integer('cd_eleicao')->nullable();
            $table->integer('turno')->nullable();
            $table->string('descricao')->nullable();
            $table->timestamps();

            $table->unique('cd_eleicao');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eleicoes');
    }
};
