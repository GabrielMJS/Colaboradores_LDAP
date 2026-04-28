# 🛰 AEB Colaboradores - Sistema de Assinaturas

Uma plataforma web moderna e integrada para a Agência Espacial Brasileira (AEB), focada em automatizar e padronizar a geração de assinaturas de e-mail corporativas utilizando dados em tempo real do **Active Directory / LDAP**.

---

## 📌 Projeto no Geral

O projeto é dividido em duas partes principais:
1. **Frontend (React + Vite)**: Interface gráfica com temas dinâmicos (claro/escuro), consumo da API e renderização via Canvas HTML5 para gerar as imagens `.png` das assinaturas instantaneamente no navegador do usuário.
2. **Backend (Python + FastAPI)**: API responsável pela comunicação direta e segura com o servidor LDAP corporativo para validação de credenciais, resgate de atributos (nome, cargo, lotação, etc.) e salvamento de configurações avançadas (overrides administrativos).

### 📂 Estrutura de Diretórios
```text
aeb-colaboradores/
├── backend/                # API em Python (FastAPI)
│   ├── app/                
│   │   ├── main.py         # Arquivo principal de rotas e inicialização
│   │   ├── ldap_service.py # Motor de conexão, consultas e bind LDAP
│   │   └── overrides_service.py # Gerencia dados customizados de colaboradores
│   ├── requirements.txt    # Lista de dependências Python
│   └── .env                # Variáveis de ambiente (credenciais LDAP/banco)
│
├── frontend/               # Interface Web em React + Vite
│   ├── public/             
│   │   └── assinatura/     # Diretório que hospeda os templates (fundos da assinatura)
│   ├── src/                
│   │   ├── components/     # Peças reutilizáveis da UI (Headers, Cards, etc.)
│   │   ├── context/        # Gerenciadores de estado global (Auth, Theme)
│   │   ├── pages/          # Páginas (Home, Login, Assinaturas, Admin)
│   │   └── services/       # Cliente HTTP para requisitar o Backend
│   ├── package.json        # Dependências do frontend
│   └── vite.config.js      # Configurações do Vite
```

### 🚀 Como Rodar o Projeto

**1. Iniciando o Backend:**
Abra o terminal na pasta raiz e siga as instruções para iniciar a API Python:
```powershell
cd backend

# Crie e ative o ambiente virtual
python -m venv venv
.\venv\Scripts\Activate.ps1  # (ou source venv/bin/activate no Linux/Mac)

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor FastAPI (rodará na porta 8000)
python app/main.py
```
> *Dica: A documentação automática da API (Swagger UI) pode ser acessada em `http://localhost:8000/docs` enquanto o servidor estiver rodando.*

**2. Iniciando o Frontend:**
Abra um **novo terminal**, navegue até a pasta do frontend e inicie a interface:
```bash
cd frontend

# Instale os pacotes e dependências (apenas na primeira execução)
npm install

# Inicie o servidor local de desenvolvimento
npm run dev
```
> *O console informará um link local (geralmente `http://localhost:5173/`). Acesse pelo navegador.*

---

## 🖥 Páginas e Navegação

O sistema foi arquitetado para ser intuitivo e conta com as seguintes telas principais:

### 🏠 Página Main (Página Inicial / Lista de Colaboradores)
- **O que acontece:** É a tela de acesso rápido, atuando como um catálogo dinâmico de todos os funcionários e colaboradores da Agência.
- **O que pode ser feito:** Você pode pesquisar pessoas por nome, cargo ou área na barra de busca inteligente. A tabela filtra dados ativos puxados do LDAP e mescla instantaneamente com configurações aplicadas pelos administradores (dados atualizados, visibilidade).

### 🔐 Página de Login
- **Autenticação Corporativa (LDAP):** A plataforma não utiliza registro por e-mail/senha soltos. A autenticação exige o login com o seu usuário de rede (`nome.sobrenome`) e senha de rede padrão da instituição.
- **Para que serve:** O login impede acessos externos aos recursos do LDAP e direciona usuários normais para suas assinaturas, e usuários com privilégios para o painel de administração.

### ✍ Página de Assinatura (Gerador)
- **O que acontece:** Ao fazer o login com sucesso, o sistema pega os dados oficias atrelados ao LDAP da pessoa e auto-preenche a tela de criação. O nome, e-mail e outras informações da rede ficam "congelados" (não editáveis para preservar padronização).
- **Como utilizar:**
  1. Visualize seus dados já preenchidos.
  2. Adicione ou edite o campo de **Ramal** (telefone).
  3. No menu suspenso (dropdown), escolha o Fundo da Assinatura (Capa). Esse menu lê os nomes reais dos arquivos existentes na pasta `public/assinatura` automaticamente.
  4. Clique em **"Gerar Preview"**. O sistema irá alinhar tipografias, fontes e aplicar as margens dinamicamente na imagem escolhida utilizando Canvas.
  5. Se o resultado visual agradar, clique em **Baixar PNG** para fazer o download da assinatura pronta e importá-la em seu cliente de e-mail.

### ⚙ Página ADMIN (Painel de Controle Administrativo)
- **Como chegar:** Essa página requer uma conta com direitos de administrador (ex: login com credenciais de administração). Colaboradores comuns são bloqueados.
- **O que pode ser feito:**
  - **Gerenciamento de Overrides:** Caso o Active Directory / LDAP demore para atualizar o cargo de um funcionário promovido, o Administrador pode procurar este funcionário e aplicar uma "edição". Os dados digitados substituem visualmente o banco de dados oficial dentro do sistema (apenas na aplicação).
  - **Ocultar/Exibir:** É possível esconder contas de serviço, salas de reunião genéricas ou ex-colaboradores que poluem a tela inicial "Main".
  - **Assinatura Modo Livre:** Um módulo onde os campos não são bloqueados, permitindo que o administrador digite ou preencha rapidamente os dados para gerar a assinatura de e-mail por outra pessoa, sem a necessidade que ela mesmo faça o login.
  - **Gerenciar Capas e Logs:** Monitoramento das assinaturas geradas e habilitação/desabilitação do catálogo das artes (capas) de fundo.

---

> _**Atenção aos Detalhes:** A aplicação completa adota o estilo tipográfico "Inter" garantindo consistência visual em todos os elementos, e suporta interações e animações de mudança suave entre os modos (Dark Theme e Light Theme)._