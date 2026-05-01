<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password', 'role', 'empresa', 'telefone', 'plano_id', 'cliente_principal_id', 'cargo', 'ultimo_acesso', 'ativo', 'assinatura_renova_em', 'assinatura_cancelada_em', 'assinatura_cancelar_no_fim_ciclo', 'asaas_cliente_id', 'asaas_assinatura_id', 'assinatura_asaas_status'])]
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
            'cliente_principal_id'   => 'integer',
            'ultimo_acesso'          => 'datetime',
            'ativo'                  => 'boolean',
            'assinatura_renova_em'   => 'datetime',
            'assinatura_cancelada_em' => 'datetime',
            'assinatura_cancelar_no_fim_ciclo' => 'boolean',
        ];
    }

    /**
     * Retorna verdadeiro enquanto a assinatura no Asaas estiver ativa.
     * Usado antes de bloquear acesso ao app.
     */
    public function assinaturaAtiva(): bool
    {
        return $this->ativo
            && !$this->assinatura_cancelar_no_fim_ciclo
            && in_array($this->assinatura_asaas_status, ['ativa', null], true);
    }

    public function plano(): BelongsTo
    {
        return $this->belongsTo(Plano::class);
    }

    public function subUsuarios(): HasMany
    {
        return $this->hasMany(self::class, 'cliente_principal_id')
            ->where('role', 'sub_usuario');
    }

    public function clientePrincipal(): BelongsTo
    {
        return $this->belongsTo(self::class, 'cliente_principal_id');
    }

    public function usuariosCliente(): HasMany
    {
        return $this->hasMany(UsuarioCliente::class, 'cliente_id');
    }

    public function pagamentosAssinaturas(): HasMany
    {
        return $this->hasMany(PagamentoAssinatura::class, 'cliente_id');
    }

    public function isAdminSaas(): bool
    {
        return $this->role === 'admin_saas';
    }

    public function isCliente(): bool
    {
        return $this->role === 'cliente';
    }

    public function isSubUsuario(): bool
    {
        return $this->role === 'sub_usuario';
    }

    public function resolverClienteDonoId(): ?int
    {
        if ($this->isCliente()) {
            return $this->id;
        }

        if ($this->isSubUsuario()) {
            return $this->cliente_principal_id;
        }

        return null;
    }
}
