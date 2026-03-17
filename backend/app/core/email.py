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


_LIFECYCLE_TEMPLATES = {
    "d1_welcome": {
        "subject": "Bem-vindo ao Jarbis! Seu primeiro dashboard em 5 minutos",
        "cta_label": "Criar meu primeiro dashboard",
        "cta_url": "https://jarbis.cc/dashboards/novo",
        "headline": "Tudo pronto para começar 🚀",
        "body": "Sua conta está ativa. O próximo passo é criar seu primeiro dashboard e conectar seus dados. Leva menos de 5 minutos.",
    },
    "d3_activation": {
        "subject": "Como estão seus dados no Jarbis?",
        "cta_label": "Adicionar meu primeiro dataset",
        "cta_url": "https://jarbis.cc/datasets",
        "headline": "Conecte seus dados reais",
        "body": "O Jarbis fica mais poderoso quando você conecta dados reais. Importe um CSV ou conecte uma API externa para ver seus números ao vivo.",
    },
    "d7_engagement": {
        "subject": "Convide seu time para o Jarbis",
        "cta_label": "Convidar colaboradores",
        "cta_url": "https://jarbis.cc/configuracoes/usuarios",
        "headline": "Análise de dados é melhor em equipe",
        "body": "Você pode convidar membros do seu time para visualizar ou editar dashboards. Cada um com o nível de acesso certo.",
    },
    "d30_retention": {
        "subject": "1 mês de Jarbis — como está sendo?",
        "cta_label": "Ver meus dashboards",
        "cta_url": "https://jarbis.cc/dashboards",
        "headline": "Um mês de insights 📊",
        "body": "Você está usando o Jarbis há 1 mês. Esperamos que seus dados estejam fazendo mais sentido. Tem alguma dúvida ou sugestão? Responda este email — lemos tudo.",
    },
}


def _lifecycle_html(template_key: str, tenant_name: str) -> str:
    t = _LIFECYCLE_TEMPLATES[template_key]
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
    <div style="background:#4f46e5;padding:28px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;background:white;border-radius:9px;display:flex;align-items:center;justify-content:center;">
        <span style="color:#4f46e5;font-weight:900;font-size:16px;">J</span>
      </div>
      <span style="color:white;font-weight:800;font-size:16px;">jarbis</span>
    </div>
    <div style="padding:36px 32px;">
      <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px;">{t['headline']}</h2>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px;">Olá, <strong>{tenant_name}</strong>! {t['body']}</p>
      <a href="{t['cta_url']}" style="display:inline-block;background:#4f46e5;color:white;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;">
        {t['cta_label']}
      </a>
    </div>
    <div style="border-top:1px solid #f3f4f6;padding:16px 32px;">
      <p style="color:#d1d5db;font-size:12px;margin:0;">Jarbis · BI embarcado para empresas brasileiras · <a href="https://jarbis.cc" style="color:#d1d5db;">jarbis.cc</a></p>
    </div>
  </div>
</body>
</html>"""


async def send_lifecycle_email(to_email: str, tenant_name: str, template_key: str) -> bool:
    """Envia email de ciclo de vida baseado no template configurado."""
    if template_key not in _LIFECYCLE_TEMPLATES:
        return False
    t = _LIFECYCLE_TEMPLATES[template_key]
    html = _lifecycle_html(template_key, tenant_name)
    return await send_admin_email(to_email, t["subject"], html)


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
