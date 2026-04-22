from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from ldap_service import LDAPService
from typing import Optional

load_dotenv()

app = FastAPI(title="AEB Colaboradores API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok"}


# ------------------------------------------------------------------
# Teste de conexão LDAP
# ------------------------------------------------------------------

@app.get("/ldap/test")
def ldap_test():
    """Testa a conexão com o servidor LDAP usando o usuário de serviço."""
    try:
        service = LDAPService()
        conn = service._get_service_connection()
        conn.unbind()
        return {"status": "ok", "message": "Conexão com LDAP estabelecida com sucesso!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ------------------------------------------------------------------
# Colaboradores (alimenta a tabela principal do frontend)
# ------------------------------------------------------------------

@app.get("/api/colaboradores")
def get_colaboradores(unidade: Optional[str] = Query(default=None)):
    """
    Retorna todos os colaboradores ativos.
    Parâmetro opcional: ?unidade=CDT
    """
    try:
        service = LDAPService()
        colaboradores = service.search_all_users(unidade=unidade)
        return {"status": "ok", "total": len(colaboradores), "data": colaboradores}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}


# ------------------------------------------------------------------
# Busca usuário individual
# ------------------------------------------------------------------

@app.get("/ldap/user/{user_id}")
def ldap_search_user(user_id: str):
    """Busca informações de um usuário pelo sAMAccountName."""
    try:
        service = LDAPService()
        user = service.search_user(user_id)
        if not user:
            return {"status": "not_found", "message": f"Usuário '{user_id}' não encontrado."}
        return {"status": "ok", "user": user}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ------------------------------------------------------------------
# Autenticação
# ------------------------------------------------------------------

@app.post("/auth/login")
def auth_login(body: LoginRequest):
    """Autentica usuário via LDAP e retorna seus dados."""
    try:
        service = LDAPService()

        user_info = service.search_user(body.username)
        if not user_info:
            return {"status": "error", "message": "Usuário não encontrado no diretório."}

        authenticated = service.authenticate(body.username, body.password)
        if not authenticated:
            return {"status": "error", "message": "Usuário ou senha inválidos."}

        return {
            "status": "ok",
            "user": {
                "username":    body.username,
                "displayName": user_info.get("displayName") or user_info.get("cn", body.username),
                "email":       user_info.get("mail", ""),
                "title":       user_info.get("title", ""),
                "department":  user_info.get("department", ""),
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
