import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "app"))
from aniversariantes_service import normalize_departments

test_users = [
    {"department": "COORDERNAÇÃO DE TECNOLOGIA DA INFORMAÇÃO"}, # Typos
    {"department": "COORDENAÇÃO DE ORÇAMENTO E FINANCAS"}, # typo missing cedilla
    {"department": "GABINETE"},
    {"department": "NÃO EXISTE DEPARTAMENTO ASSIM"}
]

norm = normalize_departments(test_users)
for u in norm:
    print(u)
