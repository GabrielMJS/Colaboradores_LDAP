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
from aniversariantes_service import apply_aniversariantes_data, normalize_departments
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
    data_aniversario: Optional[str] = None

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
        # 1. Aplica overrides mas sem filtrar agora (queremos decidir visibilidade depois do CSV)
        colaboradores = apply_overrides(colaboradores, filter_hidden=False)
        # 2. Cruza com CSV (marca _in_csv)
        colaboradores = apply_aniversariantes_data(colaboradores)
        # 3. Normaliza nomes de departamentos
        colaboradores = normalize_departments(colaboradores)
        
        # 4. Lógica Final de Visibilidade para a Home:
        # - Se o admin definiu 'visivel' (True ou False), respeitamos o admin.
        # - Se o admin NÃO definiu nada, a visibilidade depende de estar no CSV.
        home_list = []
        for c in colaboradores:
            ov = c.get("_overrides", {})
            visibilidade_admin = ov.get("visivel")
            
            is_visible = False
            if visibilidade_admin is not None:
                is_visible = visibilidade_admin
            else:
                # Default: se estiver no CSV aparece, se não fica oculto
                is_visible = c.get("_in_csv", False)
            
            if is_visible:
                home_list.append(c)
        
        return {"status": "ok", "total": len(home_list), "data": home_list}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}

@app.get("/api/admin/colaboradores")
def get_colaboradores_admin(unidade: Optional[str] = Query(default=None)):
    """Admin — retorna TODOS (incluindo ocultos) com overrides aplicados."""
    try:
        service = LDAPService()
        colaboradores = service.search_all_users(unidade=unidade)
        # No Admin, usamos apply_overrides com filter_hidden=False para ver todo mundo
        colaboradores = apply_overrides(colaboradores, filter_hidden=False)
        
        # Sincroniza a propriedade 'visivel' com a mesma lógica da Home para o Admin saber o estado padrão
        colaboradores = apply_aniversariantes_data(colaboradores)
        colaboradores = normalize_departments(colaboradores)

        for c in colaboradores:
            ov = c.get("_overrides", {})
            if ov.get("visivel") is None:
                # Se não tem override, o valor que aparece no toggle 'Visível' do Admin 
                # deve refletir se ele está ou não no CSV
                c["visivel"] = c.get("_in_csv", False)

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

@app.get("/api/aniversariantes")
def get_aniversariantes_list(meses: str = Query(default="")):
    try:
        service = LDAPService()
        colaboradores = service.search_all_users()
        colaboradores = apply_overrides(colaboradores)
        colaboradores = apply_aniversariantes_data(colaboradores)
        colaboradores = normalize_departments(colaboradores)

        meses_list = [m.zfill(2) for m in meses.split(",") if m.strip()]
        
        aniversariantes = []
        for c in colaboradores:
            data_aniv = c.get("data_aniversario")
            if data_aniv:
                parts = data_aniv.split("/")
                if len(parts) >= 2:
                    mes = parts[1]
                    if not meses_list or mes in meses_list:
                        aniversariantes.append({
                            "nome": c.get("displayName") or c.get("cn") or "",
                            "data_aniversario": data_aniv,
                            "unidade": c.get("ou") or "",
                            "email": c.get("mail") or ""
                        })
        return {"status": "ok", "data": aniversariantes}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}

@app.post("/auth/login")
def auth_login(body: LoginRequest):
    try:
        # Login hardcoded para a página de aniversariantes
        if body.username == "aniversariantes.aeb" and body.password == "Ani@123aeb":
            return {
                "status": "ok",
                "user": {
                    "username": "aniversariantes.aeb",
                    "displayName": "Aniversariantes AEB",
                    "email": "",
                    "title": "Acesso Aniversariantes",
                    "department": "AEB"
                }
            }

        service = LDAPService()
        user_info = service.search_user(body.username)
        if not user_info:
            return {"status": "error", "message": "Usuário não encontrado no diretório."}
        authenticated = service.authenticate(body.username, body.password)
        if not authenticated:
            return {"status": "error", "message": "Usuário ou senha inválidos."}
            
        # Aplica overrides e dados de aniversariantes para ter o department/ou corrigidos
        user_list = [user_info]
        user_list = apply_overrides(user_list, filter_hidden=False)
        user_list = apply_aniversariantes_data(user_list)
        user_list = normalize_departments(user_list)
        user_info = user_list[0]

        return {
            "status": "ok",
            "user": {
                "username":    body.username,
                "displayName": user_info.get("displayName") or user_info.get("cn", body.username),
                "email":       user_info.get("mail", ""),
                "title":       user_info.get("title", ""),
                "department":  user_info.get("department", ""),
                "ou":          user_info.get("ou", "")
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
