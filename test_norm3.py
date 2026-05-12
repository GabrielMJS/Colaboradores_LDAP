import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "app"))
from aniversariantes_service import apply_aniversariantes_data, normalize_departments

# Simula Eliaquim vindo do LDAP
user_info = {
    "mail": "eliaquim.ramos@aeb.gov.br",
    "displayName": "Eliaquim Monteiro Ramos",
    "department": "",
    "ou": "CTIC"
}

users = apply_aniversariantes_data([user_info])
print("Apos apply:", users)
users = normalize_departments(users)
print("Apos norm:", users)
