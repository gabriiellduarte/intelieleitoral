<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password'  => $this->passwordRules(),
            'empresa'   => ['nullable', 'string', 'max:255'],
            'telefone'  => ['nullable', 'string', 'max:30'],
            'plano_id'  => ['nullable', 'exists:planos,id'],
        ])->validate();

        return User::create([
            'name'     => $input['name'],
            'email'    => $input['email'],
            'password' => $input['password'],
            'empresa'  => $input['empresa'] ?? null,
            'telefone' => $input['telefone'] ?? null,
            'plano_id' => $input['plano_id'] ?? null,
            'role'     => 'cliente',
            'ativo'    => true,
        ]);
    }
}
