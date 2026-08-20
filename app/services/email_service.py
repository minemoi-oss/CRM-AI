from __future__ import annotations

import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage

from app.core.config import settings


class EmailDeliveryError(RuntimeError):
    pass


@dataclass(frozen=True)
class DevelopmentEmail:
    recipient: str
    subject: str
    text: str


# Non-production fallback for automated tests and local development. It is
# deliberately never printed and never used in production.
development_outbox: list[DevelopmentEmail] = []


def send_email(recipient: str, subject: str, text: str) -> None:
    if not settings.SMTP_HOST:
        if settings.APP_ENV == "production":
            raise EmailDeliveryError("Le service email n'est pas configuré.")
        development_outbox.append(DevelopmentEmail(recipient, subject, text))
        return

    if not settings.SMTP_FROM_EMAIL:
        raise EmailDeliveryError("SMTP_FROM_EMAIL n'est pas configuré.")

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(text)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls(context=ssl.create_default_context())
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        raise EmailDeliveryError("Impossible d'envoyer l'email.") from error


def send_verification_email(recipient: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/?verify_token={token}"
    send_email(
        recipient,
        "Vérifiez votre adresse email — Mine CRM AI",
        "Bienvenue sur Mine CRM AI. Vérifiez votre adresse avec ce lien "
        f"(valable 24 heures) :\n\n{link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    )


def send_password_reset_email(recipient: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/?reset_token={token}"
    send_email(
        recipient,
        "Réinitialisation du mot de passe — Mine CRM AI",
        "Une réinitialisation de mot de passe a été demandée. Utilisez ce lien "
        f"(valable 30 minutes) :\n\n{link}\n\nSi ce n'était pas vous, ignorez cet email.",
    )


def send_email_change_confirmation(recipient: str, token: str) -> None:
    link = f"{settings.FRONTEND_URL.rstrip('/')}/?verify_token={token}"
    send_email(
        recipient,
        "Confirmez votre nouvelle adresse — Mine CRM AI",
        "Confirmez cette nouvelle adresse email avec le lien suivant "
        f"(valable 30 minutes) :\n\n{link}\n\nSi vous n'avez rien demandé, ignorez cet email.",
    )


def send_security_notification(recipient: str, subject: str, message: str) -> None:
    send_email(recipient, f"{subject} — Mine CRM AI", message)
