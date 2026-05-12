import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from ldap_service import LDAPService
from database_service import (
    test_connection as test_db_connection,
    apply_db_overrides,
    upsert_colaborador,
    delete_colaborador_overrides,
    normalize_departments
)
from sync_service import full_sync
from typing import Optional
import threading
import time
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key")
ALGORITHM = "HS256"
security = HTTPBearer()

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": time.time() + 3600 * 24})  # 24h
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(auth.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

def require_admin(user = Depends(get_current_user)):
    if not user.get("isAdmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: Requer privilégios de administrador",
        )
    return user

# Intervalo de sync automatico (em horas)
SYNC_INTERVAL_HOURS = 6

from contextlib import asynccontextmanager

def _sync_periodico():
    """Thread que roda o sync LDAP -> DB periodicamente."""
    while True:
        time.sleep(SYNC_INTERVAL_HOURS * 3600)  # Espera N horas
        try:
            print(f"[SYNC-AUTO] Sync periodico iniciado (a cada {SYNC_INTERVAL_HOURS}h)...")
            full_sync()
            print("[SYNC-AUTO] Sync periodico concluido.")
        except Exception as e:
            print(f"[SYNC-AUTO] Erro no sync periodico: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Sincroniza LDAP -> banco de dados e agenda sync periodico
    try:
        if test_db_connection():
            print("[STARTUP] Banco conectado. Iniciando sync LDAP -> PostgreSQL...")
            full_sync()

            # Inicia thread de sync periodico em background
            sync_thread = threading.Thread(target=_sync_periodico, daemon=True)
            sync_thread.start()
            print(f"[STARTUP] Sync periodico agendado: a cada {SYNC_INTERVAL_HOURS} horas.")
        else:
            print("[STARTUP] Banco indisponivel. Sync ignorado, usando dados em cache.")
    except Exception as e:
        print(f"[STARTUP] Erro no sync inicial: {e}. Servidor continua normalmente.")
    
    yield
    # Shutdown logic (se necessário) pode vir aqui

app = FastAPI(title="AEB Colaboradores API", lifespan=lifespan)

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
    """Página inicial — aplica overrides do banco e filtra ocultos."""
    try:
        service = LDAPService()
        colaboradores = service.search_all_users(unidade=unidade)
        
        # O banco de dados agora contém a lógica de visibilidade (visivel=False se não estiver na planilha)
        colaboradores = apply_db_overrides(colaboradores, filter_hidden=True)
        colaboradores = normalize_departments(colaboradores)
        
        return {"status": "ok", "total": len(colaboradores), "data": colaboradores}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}

@app.get("/api/admin/colaboradores")
def get_colaboradores_admin(unidade: Optional[str] = Query(default=None), _user = Depends(require_admin)):
    """Admin — retorna TODOS (incluindo ocultos) com overrides do banco aplicados."""
    try:
        service = LDAPService()
        colaboradores = service.search_all_users(unidade=unidade)
        
        # No Admin, usamos apply_db_overrides com filter_hidden=False para ver todo mundo
        colaboradores = apply_db_overrides(colaboradores, filter_hidden=False)
        colaboradores = normalize_departments(colaboradores)

        return {"status": "ok", "total": len(colaboradores), "data": colaboradores}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}

@app.put("/api/admin/colaboradores/{username}/override")
def set_override(username: str, body: OverrideRequest, _user = Depends(require_admin)):
    try:
        fields = {k: v for k, v in body.dict().items() if v is not None}
        # Tratamento especial para mapear `unidade` para `unidade_sigla`
        if 'unidade' in fields:
            fields['unidade_sigla'] = fields.pop('unidade')
            
        upsert_colaborador(username, fields)
        return {"status": "ok", "message": f"Customizações de '{username}' salvas no banco."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/api/admin/colaboradores/{username}/override")
def remove_override(username: str, _user = Depends(require_admin)):
    try:
        delete_colaborador_overrides(username)
        return {"status": "ok", "message": f"Customizacoes de '{username}' removidas do banco."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/admin/sync")
def trigger_sync(_user = Depends(require_admin)):
    """Forca sincronizacao LDAP -> banco de dados (acionado pelo admin)."""
    try:
        result = full_sync()
        return {
            "status": "ok",
            "message": "Sincronizacao concluida.",
            "resultado": result
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/admin/db/test")
def test_db():
    """Testa a conexao com o PostgreSQL."""
    connected = test_db_connection()
    return {
        "status": "ok" if connected else "error",
        "message": "Conexao com PostgreSQL OK" if connected else "Falha na conexao com PostgreSQL"
    }

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
        colaboradores = apply_db_overrides(colaboradores, filter_hidden=False)
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
        # Credenciais Admin de fallback (podem ser movidas para .env)
        ADMIN_USER = os.getenv("ADMIN_USER", "admin.aeb")
        ADMIN_PASS = os.getenv("ADMIN_PASS", "AEB@admin2024")

        is_admin = False
        user_payload = {}

        # 1. Verifica se é o admin fixo
        if body.username == ADMIN_USER and body.password == ADMIN_PASS:
            is_admin = True
            user_payload = {
                "username": ADMIN_USER,
                "displayName": "Administrador AEB",
                "isAdmin": True
            }
        
        # 2. Login especial de aniversariantes
        elif body.username == "aniversariantes.aeb" and body.password == "Ani@123aeb":
            user_payload = {
                "username": "aniversariantes.aeb",
                "displayName": "Aniversariantes AEB",
                "isAdmin": False,
                "isAniversariantes": True
            }

        # 3. Login LDAP
        else:
            service = LDAPService()
            user_info = service.search_user(body.username)
            if not user_info:
                return {"status": "error", "message": "Usuário não encontrado no diretório."}
            
            authenticated = service.authenticate(body.username, body.password)
            if not authenticated:
                return {"status": "error", "message": "Usuário ou senha inválidos."}
                
            # Aplica overrides
            user_list = [user_info]
            user_list = apply_db_overrides(user_list, filter_hidden=False)
            user_list = normalize_departments(user_list)
            user_info = user_list[0]

            user_payload = {
                "username":    body.username,
                "displayName": user_info.get("displayName") or user_info.get("cn", body.username),
                "email":       user_info.get("mail", ""),
                "isAdmin":     False
            }

        # Gera o token JWT
        token = create_access_token(user_payload)

        return {
            "status": "ok",
            "token": token,
            "user": user_payload
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
