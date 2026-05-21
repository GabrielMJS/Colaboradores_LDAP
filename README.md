# 🛰 AEB Colaboradores — Sistema de Colaboradores e Assinaturas

Uma plataforma web moderna e integrada para a **Agência Espacial Brasileira (AEB)**, focada em consulta de colaboradores, geração de assinaturas de e-mail corporativas padronizadas e administração de dados, com integração em tempo real ao **Active Directory / LDAP**.

---

## 📌 Visão Geral

O projeto é dividido em duas partes principais:

- **Frontend (React + Vite):** Interface gráfica com temas dinâmicos (claro/escuro), consumo da API e renderização via Canvas HTML5 para gerar imagens `.png` das assinaturas diretamente no navegador.
- **Backend (Python + FastAPI):** API responsável pela comunicação com o servidor LDAP corporativo para validação de credenciais, resgate de atributos (nome, cargo, lotação, etc.) e salvamento de configurações administrativas (overrides).

---

## 📂 Estrutura de Diretórios

```text
Colaboradores_LDAP/
├── backend/
│   ├── app/
│   │   ├── main.py             # Rotas e inicialização da API
│   │   ├── ldap_service.py     # Conexão, consultas e bind LDAP
│   │   ├── database_service.py # Overrides e conexão PostgreSQL
│   │   ├── sync_service.py     # Sincronização LDAP → banco
│   │   ├── models.py           # Modelos de dados
│   │   └── utils.py            # Utilitários gerais
│   ├── requirements.txt        # Dependências Python
│   ├── Dockerfile.prod         # Imagem de produção
│   └── .env                    # Variáveis de ambiente
│
├── frontend/
│   ├── public/
│   │   └── assinatura/         # Templates (fundos da assinatura)
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── context/            # Estado global (Auth, Theme)
│   │   ├── pages/              # Páginas (Home, Login, Assinaturas, Admin)
│   │   └── services/           # Cliente HTTP (api.js)
│   ├── nginx.conf              # Configuração Nginx do container
│   ├── Dockerfile.prod         # Imagem de produção
│   └── vite.config.js
│
└── docker-compose.yml          # Orquestração dos containers
```

---

## 🏗 Arquitetura de Produção

```
Usuário
   ↓
BigIP (F5) — https://colaboradores.aeb.gov.br
   ↓
Nginx HOST (porta 8000) — SVLPDPSC (192.168.12.68)
   ↓
Docker: sis-colaborador-frontend (porta 3000→80)
   Nginx interno:
   ├── /*          → serve React estático
   ├── /api/       → proxy → backend:8000
   ├── /auth/      → proxy → backend:8000
   └── /admin/     → proxy → backend:8000
         ↓
Docker: sis-colaborador-backend (porta 8000, interno)
   FastAPI + Uvicorn
         ↓
   ├── LDAP: ldap.aeb.gov.br:389
   └── PostgreSQL: 192.168.12.68:5432
```

---

## 🚀 Produção — Subindo com Docker Compose

### Pré-requisitos
- Docker e Docker Compose instalados
- Arquivo `backend/.env` configurado (ver seção abaixo)

### Subir tudo
```bash
cd ~/Colaboradores_LDAP
docker compose up -d --build
```

### Verificar status
```bash
docker compose ps
```

### Acompanhar logs
```bash
# Todos os serviços
docker compose logs -f

# Só o backend
docker logs sis-colaborador-backend --tail 50

# Só o frontend
docker logs sis-colaborador-frontend --tail 50
```

### Reiniciar um serviço
```bash
docker compose restart backend
docker compose restart frontend
```

### Parar tudo
```bash
docker compose down
```

### Rebuild sem cache (após alterações)
```bash
docker compose build --no-cache && docker compose up -d
```

### Rebuild só do frontend
```bash
docker compose up -d --build frontend
```

### Rebuild só do backend
```bash
docker compose build --no-cache backend && docker compose up -d
```

---

## ⚙ Variáveis de Ambiente — `backend/.env`

```env
# Configurações LDAP
LDAP_HOST=ldap.aeb.gov.br
LDAP_PORT=389
LDAP_BIND_DN=CN=Eventos Dev,OU=SERVICO,OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br
LDAP_BASE_DN=OU=USUARIOS,OU=AEB,DC=aeb,DC=gov,DC=br
LDAP_BIND_PASSWORD='sua_senha_aqui'   # Use aspas simples se houver $ na senha

# Banco de Dados PostgreSQL
DB_HOST=192.168.12.68
DB_PORT=5432
DB_NAME=siscolaboradores
DB_USER=app_colaboradores
DB_PASSWORD=sua_senha_banco

# Autenticação
SECRET_KEY=sua_chave_secreta
ADMIN_USER=admin.aeb
ADMIN_PASS=sua_senha_admin

# CORS
ALLOWED_ORIGINS=https://colaboradores.aeb.gov.br,http://localhost:5173
```

> ⚠️ **Atenção:** Se a senha LDAP contiver `$`, escape com `$$` no `.env`.
> Exemplo: `senha$123` → `senha$$123`

---

## 🔌 Testando a Conexão LDAP

### Testar DNS e conectividade
```bash
docker exec sis-colaborador-backend python -c "
import socket
print('IP LDAP:', socket.gethostbyname('ldap.aeb.gov.br'))
"
```

### Testar credenciais LDAP
```bash
docker exec sis-colaborador-backend python -c "
from ldap_service import LDAPService
s = LDAPService()
conn = s._get_service_connection()
print('Conexão OK:', conn)
"
```

### Testar busca de usuário
```bash
docker exec sis-colaborador-backend python -c "
from ldap_service import LDAPService
s = LDAPService()
user = s.search_user('nome.sobrenome')
print(user)
"
```

### Testar API de colaboradores
```bash
curl -s http://localhost:3000/api/colaboradores | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Status: {d[\"status\"]} | Total: {d[\"total\"]} colaboradores')
"
```

### Testar health do backend
```bash
curl -s http://localhost:3000/health
# Esperado: {"status": "ok"}
```

---

## 🖥 Páginas e Funcionalidades

### 🏠 Página Inicial
Catálogo dinâmico de colaboradores com busca por nome, cargo ou área. Dados puxados do LDAP com overrides administrativos aplicados.

### 🔐 Login
Autenticação corporativa via LDAP (`nome.sobrenome` + senha de rede). Redireciona usuários comuns para o gerador de assinaturas e admins para o painel administrativo.

### ✍ Gerador de Assinaturas
1. Dados do LDAP preenchidos automaticamente
2. Edite o ramal e escolha o fundo da assinatura
3. Clique em **Gerar Preview** (renderização via Canvas HTML5)
4. Clique em **Baixar PNG** para usar no cliente de e-mail

### ⚙ Painel Administrativo
- **Overrides:** Substitui visualmente dados desatualizados do LDAP
- **Ocultar/Exibir:** Remove contas de serviço ou ex-colaboradores da listagem
- **Assinatura Modo Livre:** Gera assinatura para qualquer pessoa sem login
- **Gerenciar Capas:** Upload e remoção dos templates de assinatura

---

## 🌐 URLs

| Ambiente | URL |
|---|---|
| Produção | https://colaboradores.aeb.gov.br |
| Acesso direto (rede interna) | http://192.168.12.68:3000 |
| API Docs (Swagger) | http://192.168.12.68:3000/docs |
| Health Check | http://192.168.12.68:3000/health |

---

## 🖥 Desenvolvimento Local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
# ou .\venv\Scripts\Activate.ps1  # Windows

pip install -r requirements.txt
python app/main.py
# API disponível em http://localhost:8000
# Swagger em http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Interface disponível em http://localhost:5173
```

---

> 💡 **Dicas:**
> - A aplicação usa a fonte **Inter** para consistência visual
> - Suporte a **Dark Theme** e **Light Theme**
> - O sync LDAP → banco ocorre automaticamente a cada **6 horas**
