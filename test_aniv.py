import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "app"))

from aniversariantes_service import apply_aniversariantes_data, _load_siglas_reverse_map

# Mock user_info
user_info = {
    "mail": "",
    "sAMAccountName": "eliaquim.ramos",
    "displayName": "Eliaquim Monteiro Ramos",
    "department": "",
    "ou": ""
}

print("Reverse map keys:")
rmap = _load_siglas_reverse_map()
print(list(rmap.keys())[:5], "... CTIC in rmap?", "CTIC" in rmap)

applied = apply_aniversariantes_data([user_info])
print("Applied:", applied)
