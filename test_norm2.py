import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "app"))
from aniversariantes_service import normalize_departments

test_users = [
    {"department": "COORDENAÇÃO DE TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO"},
    {"department": "DIRETORIA DE PLANEJAMENTO,ORÇAMENTO,ADMINISTRAÇÃO"}
]

norm = normalize_departments(test_users)
for u in norm:
    print(u)
