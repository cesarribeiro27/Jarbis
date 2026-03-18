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
    '<img src="https://www.jarbis.cc/logo-email.svg" '
    'width="36" height="36" alt="Jarbis" '
    'style="display:block;width:36px;height:36px;" />'
)

_HEADER_HTML = (
    '<div style="background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%); padding: 28px 32px; text-align: center;">'
    '<table width="100%" cellpadding="0" cellspacing="0" border="0">'
    '<tr><td align="center">'
    '<table cellpadding="0" cellspacing="0" border="0">'
    '<tr>'
    '<td style="vertical-align:middle;">' + _LOGO_HTML + '</td>'
    '<td style="padding-left:10px;vertical-align:middle;">'
    '<span style="color:white;font-weight:800;font-size:18px;letter-spacing:-0.3px;">jarbis</span>'
    '</td>'
    '</tr>'
    '</table>'
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
    "d1_welcome": """<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l2-2-5-5-2 2z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>""",
    "d3_activation": """<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>""",
    "d7_engagement": """<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>""",
    "d30_retention": """<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>""",
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
      <div style="width: 56px; height: 56px; background: #eef2ff; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
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
        <a href="https://jarbis.cc/cadastro" style="display: inline-block; background: linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%); color: white; font-size: 15px; font-weight: 700; padding: 16px 32px; border-radius: 12px; text-decoration: none; letter-spacing: -0.1px;">
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
