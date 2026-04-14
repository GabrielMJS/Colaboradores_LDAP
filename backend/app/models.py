"""
Data models - Estruturas de dados da aplicação
"""

from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    id: str
    name: str
    email: str
    title: Optional[str] = None
    department: Optional[str] = None

class SignatureResponse(BaseModel):
    user_id: str
    signature_url: str
    created_at: str

class AuthRequest(BaseModel):
    username: str
    password: str
