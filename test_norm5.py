import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "app"))
from aniversariantes_service import apply_aniversariantes_data, normalize_departments

users = [
    {"mail": "teste@aeb.gov.br", "sAMAccountName": "teste", "displayName": "Teste Dipa", "ou": "Dipa"}
]

print("Apos norm:")
print(normalize_departments(users))
