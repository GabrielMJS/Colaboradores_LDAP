import os
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from dotenv import load_dotenv
from ldap_service import LDAPService
from database_service import (
    test_connection as test_db_connection,
    apply_db_overrides,
    upsert_colaborador,
    delete_colaborador_overrides,
    normalize_departments,
    get_siglas_reverse_map
)
from sync_service import full_sync
from typing import Optional
import threading
import time
import jwt
from fastapi import Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer
import shutil
from pathlib import Path
import base64

load_dotenv(override=True)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
security = HTTPBearer()

limiter = Limiter(key_func=get_remote_address)

# Configurações de diretório e sincronização
BASE_DIR = Path(__file__).resolve().parent.parent
CAPAS_DIR = BASE_DIR.parent / "frontend" / "public" / "assinatura"
FOTOS_DIR = BASE_DIR.parent / "frontend" / "public" / "fotos"
SYNC_INTERVAL_HOURS = 6

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": time.time() + 3600 * 24})  # 24h
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    
    # Fallback para Authorization Header (suporte a ferramentas de teste)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ausente ou expirado",
        )
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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

    return user

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
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
def get_colaboradores(
    unidade: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=1000, ge=1, le=5000)
):
    """Página inicial — aplica overrides do banco e filtra ocultos com paginação."""
    try:
        service = LDAPService()
        colaboradores = service.search_all_users(unidade=unidade)
        
        # Aplica overrides e normalização
        colaboradores = apply_db_overrides(colaboradores, filter_hidden=True)
        colaboradores = normalize_departments(colaboradores)
        
        total = len(colaboradores)
        start = (page - 1) * size
        end = start + size
        paginated_data = colaboradores[start:end]
        
        return {
            "status": "ok", 
            "total": total, 
            "page": page,
            "size": size,
            "data": paginated_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "data": [], "total": 0}

@app.get("/api/admin/colaboradores")
def get_colaboradores_admin(
    unidade: Optional[str] = Query(default=None), 
    page: int = Query(default=1, ge=1),
    size: int = Query(default=1000, ge=1, le=5000),
    _user = Depends(require_admin)
):
    """Admin — retorna TODOS com paginação."""
    try:
        service = LDAPService()
        colaboradores = service.search_all_users(unidade=unidade)
        
        colaboradores = apply_db_overrides(colaboradores, filter_hidden=False)
        colaboradores = normalize_departments(colaboradores)

        total = len(colaboradores)
        start = (page - 1) * size
        end = start + size
        paginated_data = colaboradores[start:end]

        return {
            "status": "ok", 
            "total": total, 
            "page": page,
            "size": size,
            "data": paginated_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "data": [], "total": 0}

@app.api_route("/api/admin/colaboradores/{username}/override", methods=["PUT", "POST"])
def set_override(username: str, body: OverrideRequest, _user = Depends(require_admin)):
    try:
        fields = {k: v for k, v in body.dict().items() if v is not None}
        
        # Tratamento especial para mapear `unidade` para `unidade_sigla`
        if 'unidade' in fields:
            sigla = fields.pop('unidade')
            fields['unidade_sigla'] = sigla
            
            # Atualiza automaticamente a lotação com base na sigla
            reverse_map = get_siglas_reverse_map()
            if sigla.upper() in reverse_map:
                fields['lotacao'] = reverse_map[sigla.upper()]
            
            # Atualiza coordenacao_sigla e diretoria_sigla automaticamente
            fields['coordenacao_sigla'] = sigla.upper()
            from database_service import COOR_TO_DIR
            fields['diretoria_sigla'] = COOR_TO_DIR.get(sigla.upper(), sigla.upper())
            
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

@app.post("/api/admin/colaboradores/{username}/foto")
def upload_user_photo(username: str, file: UploadFile = File(...), _user = Depends(require_admin)):
    try:
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            return {"status": "error", "message": "Apenas arquivos .png, .jpg e .jpeg são permitidos."}
        
        FOTOS_DIR.mkdir(parents=True, exist_ok=True)
        ext = file.filename.lower().split('.')[-1]
        
        # Apaga qualquer foto anterior do usuário (qualquer extensão)
        for existing in FOTOS_DIR.glob(f"{username}.*"):
            existing.unlink()
            
        file_name = f"{username}.{ext}"
        file_path = FOTOS_DIR / file_name
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        foto_url = f"/fotos/{file_name}"
        upsert_colaborador(username, {"foto_url": foto_url})
            
        return {"status": "ok", "message": "Foto enviada com sucesso.", "foto_url": foto_url}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/api/admin/colaboradores/{username}/foto")
def delete_user_photo(username: str, _user = Depends(require_admin)):
    try:
        print(f"[FOTO] Iniciando exclusão de foto para {username} no diretório {FOTOS_DIR}")
        encontrados = list(FOTOS_DIR.glob(f"{username}.*"))
        if not encontrados:
            print(f"[FOTO] Nenhuma foto encontrada para apagar em {FOTOS_DIR}")
            
        for existing in encontrados:
            try:
                existing.unlink()
                print(f"[FOTO] Apagado: {existing}")
            except Exception as e_unlink:
                print(f"[FOTO] Erro ao tentar apagar {existing}: {e_unlink}")
            
        # Limpa no banco
        upsert_colaborador(username, {"foto_url": None})
        return {"status": "ok", "message": "Foto removida com sucesso."}
    except Exception as e:
        print(f"[FOTO] Erro geral ao remover foto: {e}")
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


@app.get("/api/diagnostico/foto/{username}")
def diagnostico_foto(username: str):
    """
    Endpoint de diagnóstico: retorna informações sobre a foto do usuário.
    Use para depurar problemas sem precisar inspecionar logs do servidor.
    """
    try:
        service = LDAPService()
        user = service.search_user(username)
        if not user:
            return {"status": "not_found", "username": username, "foto": None}

        foto = user.get("foto")
        return {
            "status": "ok",
            "username": username,
            "tem_foto": foto is not None,
            "foto_tamanho_chars": len(foto) if foto else 0,
            "foto_prefix": foto[:50] if foto else None,
            "displayName": user.get("displayName", ""),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/users/{username}/photo")
def get_user_photo(username: str):
    """
    Retorna a foto do usuário como imagem JPEG (streaming).
    Preferível ao Base64 em JSON para requisitos de performance.
    Uso no frontend: <img src="/api/users/{username}/photo" />
    Retorna 404 se o usuário não tiver foto cadastrada.
    """
    try:
        service = LDAPService()
        user = service.search_user(username)
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        foto_b64 = user.get("foto")
        if not foto_b64:
            raise HTTPException(status_code=404, detail="Usuário sem foto cadastrada no LDAP")

        # Remove o prefixo data URI se presente
        if foto_b64.startswith("data:"):
            foto_b64 = foto_b64.split(",", 1)[-1]

        img_bytes = base64.b64decode(foto_b64)
        return Response(
            content=img_bytes,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Disposition": f"inline; filename={username}.jpg",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
                            "diretoria_sigla": c.get("diretoria_sigla") or "",
                            "diretoria": c.get("diretoria") or "",
                            "coordenacao_sigla": c.get("ou") or c.get("unidade") or "",
                            "coordenacao": c.get("lotacao") or c.get("department") or "",
                            "email": c.get("mail") or ""
                        })
        return {"status": "ok", "data": aniversariantes}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}


@app.get("/api/capas")
def get_capas():
    try:
        capas = []
        if CAPAS_DIR.exists():
            for idx, file_path in enumerate(CAPAS_DIR.glob("*.png"), start=1):
                capas.append({
                    "id": idx,
                    "nome": file_path.name,
                    "arquivo": f"/assinatura/{file_path.name}",
                    "ativa": True
                })
        return {"status": "ok", "data": capas}
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}

@app.post("/api/admin/capas/upload")
def upload_capa(file: UploadFile = File(...), _user = Depends(require_admin)):
    try:
        if not file.filename.lower().endswith('.png'):
            return {"status": "error", "message": "Apenas arquivos .png são permitidos."}
        
        CAPAS_DIR.mkdir(parents=True, exist_ok=True)
        file_path = CAPAS_DIR / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"status": "ok", "message": f"Arquivo '{file.filename}' importado com sucesso."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/api/admin/capas/{filename}")
def delete_capa(filename: str, _user = Depends(require_admin)):
    try:
        if ".." in filename or filename.startswith("/") or filename.startswith("\\"):
            return {"status": "error", "message": "Nome de arquivo inválido."}
            
        file_path = CAPAS_DIR / filename
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return {"status": "ok", "message": f"Arquivo '{filename}' excluído com sucesso."}
        else:
            return {"status": "error", "message": "Arquivo não encontrado."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/auth/login")
@limiter.limit("5/minute")
def auth_login(request: Request, body: LoginRequest, response: Response):
    try:
        # Credenciais Admin de fallback (movidas para .env)
        ADMIN_USER = os.getenv("ADMIN_USER")
        ADMIN_PASS = os.getenv("ADMIN_PASS")

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
                "title":       user_info.get("title", ""),
                "department":  user_info.get("department", ""),
                "ou":          user_info.get("ou", ""),
                "diretoria_sigla": user_info.get("diretoria_sigla", ""),
                "diretoria":   user_info.get("diretoria", ""),
                "ramal":       user_info.get("telephoneNumber", ""),
                "isAdmin":     False
            }

        # Gera o token JWT
        token = create_access_token(user_payload)

        # Configura cookie HttpOnly para segurança contra XSS
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            max_age=3600 * 24, # 24h
            expires=3600 * 24,
            samesite="lax",    # Lax permite redirecionamentos comuns mas protege contra CSRF básico
            secure=False       # Setar para True se usar HTTPS (recomendado em prod)
        )

        return {
            "status": "ok",
            "token": token, # Mantido para compatibilidade temporária se necessário
            "user": user_payload
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/auth/logout")
def auth_logout(response: Response):
    """Limpa o cookie de autenticação."""
    response.delete_cookie("access_token")
    return {"status": "ok", "message": "Logout realizado com sucesso"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
