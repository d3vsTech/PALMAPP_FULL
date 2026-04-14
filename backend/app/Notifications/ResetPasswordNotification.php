<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(
        protected string $token,
        protected string $frontendUrl,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = $this->frontendUrl . '?' . http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        $expiresIn = config('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject('Restablecer contraseña — Agro Campo')
            ->greeting('Hola ' . $notifiable->name . ',')
            ->line('Recibiste este correo porque se solicitó un restablecimiento de contraseña para tu cuenta.')
            ->action('Restablecer contraseña', $url)
            ->line("Este enlace expirará en {$expiresIn} minutos.")
            ->line('Si no solicitaste un restablecimiento de contraseña, no es necesario realizar ninguna acción.')
            ->salutation('Saludos, Equipo Agro Campo');
    }
}
