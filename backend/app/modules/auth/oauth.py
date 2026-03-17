"""
OAuth 2.0 helpers para login social.

Provedores suportados: google, microsoft, github
Fluxo: authorization code grant via httpx (sem nova dependência — já no projeto).
"""

import httpx
from urllib.parse import urlencode

from app.config import settings


# ─── Configuração dos provedores ─────────────────────────────────────────────

PROVIDERS = {
    "google": {
        "auth_url":    "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url":   "https://oauth2.googleapis.com/token",
        "profile_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scopes":      "openid email profile",
        "client_id":     lambda: settings.google_client_id,
        "client_secret": lambda: settings.google_client_secret,
    },
    "microsoft": {
        "auth_url":    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url":   "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "profile_url": "https://graph.microsoft.com/v1.0/me",
        "scopes":      "openid email profile User.Read",
        "client_id":     lambda: settings.microsoft_client_id,
        "client_secret": lambda: settings.microsoft_client_secret,
    },
    "github": {
        "auth_url":    "https://github.com/login/oauth/authorize",
        "token_url":   "https://github.com/login/oauth/access_token",
        "profile_url": "https://api.github.com/user",
        "scopes":      "read:user user:email",
        "client_id":     lambda: settings.github_client_id,
        "client_secret": lambda: settings.github_client_secret,
    },
}


def _redirect_uri(provider: str) -> str:
    return f"{settings.backend_url}/auth/oauth/{provider}/callback"


def get_authorization_url(provider: str) -> str:
    """Retorna a URL de autorização do provedor."""
    cfg = PROVIDERS[provider]
    params = {
        "client_id":     cfg["client_id"](),
        "redirect_uri":  _redirect_uri(provider),
        "scope":         cfg["scopes"],
        "response_type": "code",
        "state":         provider,  # simples — produção deve usar CSRF token
    }
    if provider == "google":
        params["access_type"] = "online"
    return f"{cfg['auth_url']}?{urlencode(params)}"


async def exchange_code_for_profile(provider: str, code: str) -> dict:
    """Troca o code pelo access_token e retorna o perfil do usuário."""
    cfg = PROVIDERS[provider]

    # 1. Trocar code por token
    token_data = {
        "client_id":     cfg["client_id"](),
        "client_secret": cfg["client_secret"](),
        "code":          code,
        "redirect_uri":  _redirect_uri(provider),
        "grant_type":    "authorization_code",
    }

    headers = {}
    if provider == "github":
        headers["Accept"] = "application/json"

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(cfg["token_url"], data=token_data, headers=headers)
        token_resp.raise_for_status()
        token_json = token_resp.json()

    access_token = token_json.get("access_token")
    if not access_token:
        raise ValueError(f"Falha ao obter access_token do {provider}: {token_json}")

    # 2. Buscar perfil
    profile_headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        profile_resp = await client.get(cfg["profile_url"], headers=profile_headers)
        profile_resp.raise_for_status()
        profile = profile_resp.json()

    # 3. Normalizar retorno
    return _normalize_profile(provider, profile, access_token)


def _normalize_profile(provider: str, raw: dict, access_token: str) -> dict:
    """Normaliza o perfil para um formato comum."""
    if provider == "google":
        return {
            "provider":   "google",
            "provider_id": raw.get("sub"),
            "email":      raw.get("email"),
            "name":       raw.get("name") or raw.get("email", "").split("@")[0],
            "verified":   raw.get("email_verified", False),
        }
    elif provider == "microsoft":
        return {
            "provider":    "microsoft",
            "provider_id": raw.get("id"),
            "email":       raw.get("mail") or raw.get("userPrincipalName", ""),
            "name":        raw.get("displayName") or raw.get("givenName", ""),
            "verified":    True,
        }
    elif provider == "github":
        return {
            "provider":    "github",
            "provider_id": str(raw.get("id")),
            "email":       raw.get("email") or f"github_{raw.get('id')}@noreply.github.com",
            "name":        raw.get("name") or raw.get("login", ""),
            "verified":    bool(raw.get("email")),
        }
    return raw
