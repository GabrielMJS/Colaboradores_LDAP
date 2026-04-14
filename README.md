# AEB Colaboradores

Plataforma para geração de assinaturas digitais a partir de dados de colaboradores via LDAP.

## Estrutura do Projeto

```
aeb-colaboradores/          ← pasta raiz (seu repositório)
│
├── backend/                ← tudo do Python
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         ← servidor FastAPI
│   │   ├── ldap_service.py ← conexão com o LDAP
│   │   ├── signature_service.py ← geração de assinatura PNG
│   │   └── models.py       ← estrutura dos dados
│   ├── requirements.txt    ← dependências Python
│   └── .env                ← credenciais (não sobe pro git)
│
├── frontend/               ← tudo do React
│   ├── public/
│   │   └── logo-aeb.png
│   ├── src/
│   │   ├── components/     ← peças reutilizáveis
│   │   ├── pages/          ← telas
│   │   ├── services/       ← chamadas à API
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── .gitignore
└── README.md
```

## Backend (Python + FastAPI)

### Setup Inicial

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Configuração de Credenciais

Crie um arquivo `.env` na pasta `backend/`:

```env
LDAP_SERVER_URL=ldap://seu-servidor-ldap
LDAP_USERNAME=seu_usuario_ldap
LDAP_PASSWORD=sua_senha_ldap
API_HOST=localhost
API_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### Executar o Servidor

```bash
cd backend
python -m app.main
```

A API estará disponível em `http://localhost:8000`
Documentação interativa: `http://localhost:8000/docs`

### Estrutura do Backend

- **`main.py`** - Aplicação FastAPI com CORS configurado
- **`ldap_service.py`** - Serviço para autenticação e busca de usuários no LDAP
- **`signature_service.py`** - Geração de assinaturas PNG a partir de dados do usuário
- **`models.py`** - Schemas Pydantic para validação de dados
- **`requirements.txt`** - Dependências Python

## Frontend (React + Vite)

### Setup Inicial

```bash
cd frontend
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse em `http://localhost:3000`

### Build para Produção

```bash
npm run build
```

### Estrutura do Frontend

```
src/
├── components/  - Componentes reutilizáveis
├── pages/       - Páginas/telas da aplicação
├── services/    - Chamadas à API (axios)
├── App.jsx      - Componente raiz
└── main.jsx     - Entry point
```

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check da API |
| POST | `/api/auth` | Autenticação via LDAP |
| GET | `/api/user/{id}` | Dados do usuário |
| GET | `/api/signature/{user_id}` | Gerar assinatura PNG |

## Tecnologias

### Backend
- **FastAPI** - Framework web assíncrono
- **Python-LDAP** - Integração com LDAP
- **Pillow** - Geração de imagens
- **Pydantic** - Validação de dados
- **Uvicorn** - Servidor ASGI

### Frontend
- **React 18+** - UI library
- **Vite** - Build tool rápido
- **Axios** - Cliente HTTP
- **Node.js** - Runtime JavaScript

## Variáveis de Ambiente

### Backend (.env)
```env
LDAP_SERVER_URL       # URL do servidor LDAP
LDAP_USERNAME         # Usuário para autenticação LDAP
LDAP_PASSWORD         # Senha para autenticação LDAP
API_HOST              # Host da API (default: localhost)
API_PORT              # Porta da API (default: 8000)
FRONTEND_URL          # URL do frontend para CORS
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000
```

## Fluxo de Utilização

1. Usuário acessa a aplicação React
2. Realiza login com credenciais LDAP via API
3. Busca dados do colaborador no LDAP
4. API gera assinatura PNG personalizada
5. Frontend exibe/baixa a assinatura

## Desenvolvimento

### Instalação de Dependências

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### Rodando Ambos Simultaneamente

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
python -m app.main
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

## Notas Importantes

- `.env` deve estar no `.gitignore` (nunca fazer commit de credenciais)
- LDAP deve estar configurado e acessível
- Frontend roda em `localhost:3000` e backend em `localhost:8000`
- CORS está habilitado para desenvolvimento

---

**Autor:** Gabriel Madureira  
**Projeto:** AEB Colaboradores - Geração de Assinaturas LDAP