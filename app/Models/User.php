<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password', 'role', 'empresa', 'telefone', 'plano_id', 'ativo'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    protected function casts(): array
    {
        return [
            'email_verified_at'      => 'datetime',
            'password'               => 'hashed',
            'two_factor_confirmed_at'=> 'datetime',
            'ativo'                  => 'boolean',
        ];
    }

    public function plano(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Plano::class);
    }

    public function usuariosCliente(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(UsuarioCliente::class, 'cliente_id');
    }

    public function isAdminSaas(): bool
    {
        return $this->role === 'admin_saas';
    }

    public function isCliente(): bool
    {
        return $this->role === 'cliente';
    }
}
