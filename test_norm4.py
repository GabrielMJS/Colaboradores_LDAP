import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "app"))
from aniversariantes_service import apply_aniversariantes_data, normalize_departments

users = [
    {"mail": "edivaldosousa@aeb.gov.br", "sAMAccountName": "edivaldo.sousa", "displayName": "Edivaldo Sousa", "ou": "DSG"},
    {"mail": "cristiano.trein@aeb.gov.br", "sAMAccountName": "cristiano.trein", "displayName": "Cristiano Trein", "ou": "DGSE"}
]

print("Apos norm:")
print(normalize_departments(users))
