"""
Exceções customizadas da aplicação.

Centralizar as exceções evita a repetição de códigos HTTP espalhados
pelo código e facilita a padronização das respostas de erro.
"""

from fastapi import HTTPException, status


class JarbisException(HTTPException):
    """Base para todas as exceções da plataforma."""
    pass


class NotFoundError(JarbisException):
    def __init__(self, resource: str, identifier: str | int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} '{identifier}' não encontrado.",
        )


class UnauthorizedError(JarbisException):
    def __init__(self, message: str = "Credenciais inválidas ou ausentes."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenError(JarbisException):
    def __init__(self, message: str = "Acesso não permitido."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )


class ConflictError(JarbisException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        )


class ValidationError(JarbisException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )


class PlanLimitError(JarbisException):
    """Lançada quando um tenant atinge o limite do seu plano."""
    def __init__(self, message: str = "Limite do plano atingido. Faça upgrade para continuar."):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=message,
        )
