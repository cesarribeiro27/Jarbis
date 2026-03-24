"""
Serviço de email via Resend.
"""

import os
import httpx


RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "Jarbis <noreply@jarbis.cc>")

_TAGLINE = "Inteligência de dados para quem faz acontecer."

_BASE_STYLES = """
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  background: #f1f5f9;
  margin: 0;
  padding: 40px 20px;
""".strip()

# Logo como <img> hospedado — SVG inline é ignorado por Gmail/Outlook.
# Logo correto: símbolo de órbita + ∴ (versão branca para fundo violeta).
_LOGO_HTML = (
    '<img src="https://jarbis.cc/logo-email.svg" '
    'width="36" height="36" alt="Jarbis" '
    'style="display:block;width:36px;height:36px;" />'
)

_HEADER_HTML = (
    # Fundo dark com glow radial — mesmo padrão da tela de login
    '<div style="background:#0B0A1A;padding:40px 32px 36px;text-align:center;border-radius:16px 16px 0 0;">'
    # Glow via camada com gradiente radial (Gmail/Apple Mail suportam; Outlook mostra dark sólido — ok)
    '<div style="background:radial-gradient(ellipse at 50% 40%,rgba(124,58,237,0.40) 0%,transparent 70%);padding:0;margin:-40px -32px 0;height:0;">&zwnj;</div>'
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:0;">'
    '<tr><td align="center" style="padding-bottom:16px;">'
    '<table cellpadding="0" cellspacing="0" border="0">'
    '<tr>'
    '<td style="vertical-align:middle;">' + _LOGO_HTML + '</td>'
    '<td style="padding-left:12px;vertical-align:middle;">'
    '<span style="color:#ffffff;font-weight:900;font-size:22px;letter-spacing:-0.05em;">jar<span style="color:#A78BFA;">b</span>is</span>'
    '</td>'
    '</tr>'
    '</table>'
    '</td></tr>'
    '<tr><td align="center">'
    '<div style="width:40px;height:1px;background:rgba(167,139,250,0.30);margin:0 auto 14px;"></div>'
    '</td></tr>'
    '</table>'
    '</div>'
)

_FOOTER_HTML = """
  <div style="border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; background: #f8fafc;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 6px;">{tagline}</p>
    <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
      <a href="https://jarbis.cc" style="color: #94a3b8; text-decoration: none;">jarbis.cc</a>
      &nbsp;·&nbsp;
      <a href="mailto:suporte@jarbis.cc" style="color: #94a3b8; text-decoration: none;">suporte@jarbis.cc</a>
      &nbsp;·&nbsp; © 2026 Jarbis
    </p>
  </div>
""".format(tagline=_TAGLINE).strip()


async def send_verification_email(to_email: str, full_name: str, code: str) -> None:
    """Envia email com código de verificação de 6 dígitos."""
    if not RESEND_API_KEY:
        print(f"[EMAIL] RESEND_API_KEY não configurada. Código para {to_email}: {code}")
        return

    digit_boxes = "".join([
        f'<span style="display:inline-block;width:38px;height:48px;line-height:48px;'
        f'text-align:center;font-size:26px;font-weight:900;color:#0f172a;'
        f'background:white;border:2px solid #ddd6fe;border-radius:8px;'
        f'margin:0 3px;font-family:\'Courier New\',Courier,monospace;">{d}</span>'
        for d in code
    ])

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Confirme seu email</title>
</head>
<body style="{_BASE_STYLES}">
  <!-- Preheader (oculto, aparece no preview do inbox) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Seu código de verificação: {code} · Expira em 15 minutos.
  </div>

  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    {_HEADER_HTML}

    <!-- Corpo -->
    <div style="padding: 40px 32px 32px;">
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.4px;">
        Confirme seu email
      </h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
        Olá, <strong style="color: #0f172a;">{full_name}</strong>! Use o código abaixo para ativar sua conta. Simples assim.
      </p>

      <!-- Caixa do código OTP -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
        <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 16px;">
          Código de verificação
        </p>
        <div style="margin-bottom: 16px;">
          {digit_boxes}
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          &#9201; Expira em <strong>15 minutos</strong>
        </p>
      </div>

      <!-- Aviso de segurança -->
      <div style="display: flex; align-items: flex-start; gap: 10px; background: #fafafa; border-left: 3px solid #e2e8f0; border-radius: 0 8px 8px 0; padding: 12px 16px;">
        <span style="font-size: 14px; line-height: 1.5;">&#128274;</span>
        <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5;">
          Se você não criou uma conta no Jarbis, pode ignorar este email com segurança.
        </p>
      </div>
    </div>

    {_FOOTER_HTML}
  </div>
</body>
</html>"""

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
                "subject": f"{code} · Confirme sua conta no Jarbis",
                "html": html,
            },
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            print(f"[EMAIL] Erro ao enviar: {resp.status_code} {resp.text}")


_LIFECYCLE_ICONS = {
    "d1_welcome": (
        '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">'
        '<rect width="40" height="40" rx="12" fill="#f5f3ff"/>'
        '<path d="M13 27.5c-1 .84-1.5 3.5-1.5 3.5s2.5-.4 3.5-1.5l1.5-1.5-3.5-3.5-1.5 1.5z" stroke="#6D28D9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M20 23l-2-2a16 16 0 0 1 1.5-3A9 9 0 0 1 27 13c0 2-.5 5.5-4 8a16 16 0 0 1-3 2z" stroke="#6D28D9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
        '</svg>'
    ),
    "d3_activation": (
        '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">'
        '<rect width="40" height="40" rx="12" fill="#f5f3ff"/>'
        '<path d="M13 28v-6M20 28v-14M27 28v-10M11 28h18" stroke="#6D28D9" stroke-width="1.75" stroke-linecap="round"/>'
        '</svg>'
    ),
    "d7_engagement": (
        '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">'
        '<rect width="40" height="40" rx="12" fill="#f5f3ff"/>'
        '<circle cx="18" cy="16" r="4" stroke="#6D28D9" stroke-width="1.75"/>'
        '<path d="M12 28v-1a6 6 0 0 1 6-6v0a6 6 0 0 1 6 6v1" stroke="#6D28D9" stroke-width="1.75" stroke-linecap="round"/>'
        '<path d="M25 13a3 3 0 0 1 0 6M27 28v-1a6 6 0 0 0-3-5.2" stroke="#6D28D9" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>'
        '</svg>'
    ),
    "d30_retention": (
        '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">'
        '<rect width="40" height="40" rx="12" fill="#f5f3ff"/>'
        '<path d="M20 12l2 5h5l-4 3 1.5 5L20 22l-4.5 3L17 20l-4-3h5z" stroke="#6D28D9" stroke-width="1.6" stroke-linejoin="round"/>'
        '</svg>'
    ),
}

_LIFECYCLE_TEMPLATES = {
    "d1_welcome": {
        "subject": "Tudo pronto — crie seu primeiro dashboard agora",
        "headline": "Você está dentro. E agora?",
        "body": "Sua conta está ativa. Em menos de 5 minutos você já pode ter seu primeiro dashboard funcionando. Arraste, solte, visualize — sem código, sem complicação.",
        "cta_label": "Criar meu primeiro dashboard",
        "cta_url": "https://jarbis.cc/dashboards/novo",
        "tip": "Dashboards com arrastar e soltar — sem escrever uma linha de código.",
    },
    "d3_activation": {
        "subject": "Seus dados reais estão esperando por você",
        "headline": "Hora de conectar seus dados",
        "body": "O Jarbis fica muito mais útil quando você conecta dados reais. Importe um CSV ou aponte para uma API — seus números aparecem na tela em segundos.",
        "cta_label": "Adicionar meu primeiro dataset",
        "cta_url": "https://jarbis.cc/datasets",
        "tip": "Suporte a CSV, Google Sheets e APIs REST. Tudo sem configuração complexa.",
    },
    "d7_engagement": {
        "subject": "Compartilhe seus dados com quem importa",
        "headline": "Dados são melhores compartilhados",
        "body": "Convide seu time para ver e editar dashboards. Defina quem pode visualizar, quem pode editar — controle total sem burocracia.",
        "cta_label": "Convidar colaboradores",
        "cta_url": "https://jarbis.cc/configuracoes/usuarios",
        "tip": "Controle de acesso por nível: visualizador, editor e administrador.",
    },
    "d30_retention": {
        "subject": "1 mês de Jarbis — como estão seus dados?",
        "headline": "Um mês. E seus dados?",
        "body": "Já faz um mês desde que você entrou no Jarbis. Esperamos que seus números estejam mais claros e suas decisões mais rápidas. Tem alguma dúvida ou sugestão? Responda este email — a gente lê tudo.",
        "cta_label": "Ver meus dashboards",
        "cta_url": "https://jarbis.cc/dashboards",
        "tip": "Suporte disponível em suporte@jarbis.cc. Resposta em até 24h.",
    },
}


def _lifecycle_html(template_key: str, tenant_name: str) -> str:
    t = _LIFECYCLE_TEMPLATES[template_key]
    icon = _LIFECYCLE_ICONS.get(template_key, "")

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>{t['subject']}</title>
</head>
<body style="{_BASE_STYLES}">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    {t['body'][:80]}...
  </div>

  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    {_HEADER_HTML}

    <!-- Corpo -->
    <div style="padding: 40px 32px 32px;">

      <!-- Ícone temático -->
      <div style="margin-bottom: 24px;">
        {icon}
      </div>

      <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.4px;">
        {t['headline']}
      </h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 28px;">
        Olá, <strong style="color: #0f172a;">{tenant_name}</strong>! {t['body']}
      </p>

      <!-- CTA Button -->
      <a href="{t['cta_url']}" style="display: inline-block; background-color: #6D28D9; background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%); color: white; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 12px; text-decoration: none; letter-spacing: -0.1px;">
        {t['cta_label']} &rarr;
      </a>

      <!-- Dica rápida -->
      <div style="margin-top: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
        <p style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px;">Dica rápida</p>
        <p style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0;">
          &#128161; {t['tip']}
        </p>
      </div>
    </div>

    <!-- Footer lifecycle com descadastro -->
    <div style="border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; background: #f8fafc;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 6px;">{_TAGLINE}</p>
      <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
        <a href="https://jarbis.cc" style="color: #94a3b8; text-decoration: none;">jarbis.cc</a>
        &nbsp;·&nbsp;
        <a href="mailto:suporte@jarbis.cc" style="color: #94a3b8; text-decoration: none;">suporte@jarbis.cc</a>
        &nbsp;·&nbsp; © 2026 Jarbis
      </p>
    </div>
  </div>
</body>
</html>"""


async def send_password_reset_email(to_email: str, full_name: str, reset_url: str) -> None:
    """Envia email com link para redefinição de senha."""
    if not RESEND_API_KEY:
        print(f"[EMAIL] RESEND_API_KEY não configurada. Reset URL para {to_email}: {reset_url}")
        return

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Redefinição de senha</title>
</head>
<body style="{_BASE_STYLES}">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Clique no link para redefinir sua senha do Jarbis. O link expira em 1 hora.
  </div>

  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    {_HEADER_HTML}

    <!-- Corpo -->
    <div style="padding: 40px 32px 32px;">
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.4px;">
        Redefinição de senha
      </h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
        Olá, <strong style="color: #0f172a;">{full_name}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta no Jarbis.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="{reset_url}" style="display: inline-block; background-color: #6D28D9; background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%); color: white; font-size: 15px; font-weight: 700; padding: 16px 32px; border-radius: 12px; text-decoration: none; letter-spacing: -0.1px;">
          Redefinir minha senha &rarr;
        </a>
      </div>

      <!-- Aviso de segurança -->
      <div style="background: #fafafa; border-left: 3px solid #e2e8f0; border-radius: 0 8px 8px 0; padding: 12px 16px;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5;">
          &#128274; Se não foi você quem solicitou, ignore este email com segurança — sua senha não será alterada. O link expira em <strong>1 hora</strong>.
        </p>
      </div>
    </div>

    {_FOOTER_HTML}
  </div>
</body>
</html>"""

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
                "subject": "Redefinição de senha — Jarbis",
                "html": html,
            },
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            print(f"[EMAIL] Erro ao enviar reset de senha: {resp.status_code} {resp.text}")


async def send_admin_invite_email(to_email: str, role_label: str, inviter_email: str) -> None:
    """Envia convite para membro da equipe interna que ainda não tem conta Jarbis."""
    if not RESEND_API_KEY:
        print(f"[EMAIL] RESEND_API_KEY não configurada. Convite para {to_email}")
        return

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Convite para o painel Jarbis</title>
</head>
<body style="{_BASE_STYLES}">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Você foi convidado para acessar o painel interno do Jarbis como {role_label}.
  </div>

  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    {_HEADER_HTML}

    <div style="padding: 40px 32px 32px;">
      <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.4px;">
        Você foi adicionado à equipe
      </h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
        <strong style="color: #0f172a;">{inviter_email}</strong> adicionou você ao painel interno do Jarbis como <strong style="color: #6D28D9;">{role_label}</strong>.
      </p>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
        Para acessar, crie sua conta gratuita usando <strong>{to_email}</strong> — o acesso ao painel será liberado automaticamente.
      </p>

      <div style="text-align: center; margin-bottom: 28px;">
        <a href="https://jarbis.cc/signup" style="display: inline-block; background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%); color: white; font-size: 15px; font-weight: 700; padding: 16px 32px; border-radius: 12px; text-decoration: none; letter-spacing: -0.1px;">
          Criar minha conta &rarr;
        </a>
      </div>

      <div style="background: #fafafa; border-left: 3px solid #e2e8f0; border-radius: 0 8px 8px 0; padding: 12px 16px;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0; line-height: 1.5;">
          &#128274; Use exatamente o email <strong>{to_email}</strong> no cadastro para que o acesso seja reconhecido automaticamente.
        </p>
      </div>
    </div>

    {_FOOTER_HTML}
  </div>
</body>
</html>"""

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
                "subject": f"Convite para o painel Jarbis — {role_label}",
                "html": html,
            },
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            print(f"[EMAIL] Erro ao enviar convite: {resp.status_code} {resp.text}")


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
