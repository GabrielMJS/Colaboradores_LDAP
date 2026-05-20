@echo off
title AEB Colaboradores - Inicializador Fullstack
cls
echo =====================================================================
echo              AEB COLABORADORES - INICIALIZADOR SIMULTANEO
echo =====================================================================
echo.
echo  [1/2] Iniciando Servidor Backend (FastAPI na porta 8000)...
start "Backend (FastAPI)" cmd /k "cd backend && venv\Scripts\activate && python app/main.py"

echo  [2/2] Iniciando Servidor Frontend (Vite na porta 5173)...
start "Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo  PRONTO! Ambos os servidores foram iniciados em janelas separadas.
echo  - Voce pode fechar esta janela principal com seguranca.
echo  - Os logs de cada servico estao sendo exibidos nas novas janelas.
echo =====================================================================
echo.
pause
