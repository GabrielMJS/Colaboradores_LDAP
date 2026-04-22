from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from ldap_service import LDAPService
from overrides_service import (
    get_all_overrides,
    save_override,
    delete_override,
    apply_overrides,
)
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

class OverrideRequest(BaseModel):
    ramal:   Optional[str]  = None
    cargo:   Optional[str]  = None
    unidade: Optional[str]  = None
    visivel: Optional[bool] = None

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/ldap/test")
def ldap_test():
    try:
        service = LDAPService()
        conn = service._get_service_connection()
        conn.unbind()
        return {"status": "ok", "message": "Conexão com LDAP estabelecida com sucesso!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/colaboradores")
def get_colaboradores(unidade: Optional[str] = Query(default=None)):
    """Página inicial — aplica overrides e filtra ocultos."""
    try:
        service = LDAPService()
        colaboradores = service.search_all_users(unidade=unidade)
        colaboradores = apply_overrides(colaboradores)
        return {"status": "ok", "total": len(colaboradores), "data": colaboradores}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}

@app.get("/api/admin/colaboradores")
def get_colaboradores_admin(unidade: Optional[str] = Query(default=None)):
    """Admin — retorna TODOS (incluindo ocultos) com overrides aplicados."""
    try:
        service = LDAPService()
        colaboradores = service.search_all_users(unidade=unidade)
        overrides = get_all_overrides()
        for c in colaboradores:
            username = c.get("sAMAccountName", "")
            ov = overrides.get(username, {})
            if "ramal"   in ov: c["telephoneNumber"] = ov["ramal"]
            if "cargo"   in ov: c["title"]           = ov["cargo"]
            if "unidade" in ov: c["ou"]              = ov["unidade"]
            c["_overrides"] = ov
            c["visivel"] = ov.get("visivel", True)
        return {"status": "ok", "total": len(colaboradores), "data": colaboradores}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}

@app.put("/api/admin/colaboradores/{username}/override")
def set_override(username: str, body: OverrideRequest):
    try:
        fields = {k: v for k, v in body.dict().items() if v is not None}
        save_override(username, fields)
        return {"status": "ok", "message": f"Customizações de '{username}' salvas."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/api/admin/colaboradores/{username}/override")
def remove_override(username: str):
    try:
        delete_override(username)
        return {"status": "ok", "message": f"Customizações de '{username}' removidas."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/ldap/user/{user_id}")
def ldap_search_user(user_id: str):
    try:
        service = LDAPService()
        user = service.search_user(user_id)
        if not user:
            return {"status": "not_found", "message": f"Usuário '{user_id}' não encontrado."}
        return {"status": "ok", "user": user}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/auth/login")
def auth_login(body: LoginRequest):
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
