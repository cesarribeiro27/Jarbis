"""
Serviço de email via Resend.
"""

import os
import httpx


RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "Jarbis <noreply@jarbis.cc>")


async def send_verification_email(to_email: str, full_name: str, code: str) -> None:
    """Envia email com código de verificação de 6 dígitos."""
    if not RESEND_API_KEY:
        print(f"[EMAIL] RESEND_API_KEY não configurada. Código para {to_email}: {code}")
        return

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06);">
        <!-- Header -->
        <div style="background: #4f46e5; padding: 32px; text-align: center;">
          <div style="width: 40px; height: 40px; background: white; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span style="color: #4f46e5; font-weight: 900; font-size: 18px;">J</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">Jarbis</h1>
        </div>

        <!-- Body -->
        <div style="padding: 40px 32px;">
          <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin: 0 0 8px;">Confirme seu email</h2>
          <p style="color: #6b7280; font-size: 15px; margin: 0 0 32px;">Olá, <strong>{full_name}</strong>! Use o código abaixo para ativar sua conta no Jarbis.</p>

          <!-- Code box -->
          <div style="background: #f3f4f6; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 32px;">
            <p style="color: #6b7280; font-size: 13px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Código de verificação</p>
            <p style="color: #111827; font-size: 40px; font-weight: 900; letter-spacing: 12px; margin: 0; font-family: monospace;">{code}</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 12px 0 0;">Expira em 15 minutos</p>
          </div>

          <p style="color: #9ca3af; font-size: 13px; margin: 0;">Se você não criou uma conta no Jarbis, pode ignorar este email com segurança.</p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #f3f4f6; padding: 20px 32px; text-align: center;">
          <p style="color: #d1d5db; font-size: 12px; margin: 0;">Jarbis · BI embarcado para empresas brasileiras</p>
        </div>
      </div>
    </body>
    </html>
    """

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": FROM_EMAIL,
                "to": [to_email],
                "subject": f"{code} é seu código de verificação do Jarbis",
                "html": html,
            },
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            print(f"[EMAIL] Erro ao enviar: {resp.status_code} {resp.text}")


async def send_admin_email(to_email: str, subject: str, html: str) -> bool:
    """
    Envia um email avulso via Resend.
    Retorna True se enviado com sucesso, False caso contrário.
    """
    if not RESEND_API_KEY:
        print(f"[EMAIL] RESEND_API_KEY não configurada. Simulando envio para {to_email}: {subject}")
        return True

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            print(f"[EMAIL] Erro ao enviar para {to_email}: {resp.status_code} {resp.text}")
            return False
        return True
