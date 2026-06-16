import os
import sys

from app.database_service import get_departamento_hierarchy, resolve_hierarchy, get_siglas_map, get_siglas_reverse_map

dept_dict = get_departamento_hierarchy()

path = []
current = "DSEG"
while current and current in dept_dict:
    path.append(dept_dict[current])
    current = dept_dict[current]["diretoria_pai"]

print("DSEG path before reverse:", [p['sigla'] for p in path])

d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("DSEG", dept_dict)
print(f"DSEG resolve -> d_sig: '{d_sig}', c_sig: '{c_sig}', div_sig: '{div_sig}'")

d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("CTI", dept_dict)
print(f"CTI resolve -> d_sig: '{d_sig}', c_sig: '{c_sig}', div_sig: '{div_sig}'")

c = {"ou": "DSEG", "department": ""}
lowest_node = c.get("ou", "")
d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy(lowest_node.strip().upper(), dept_dict)

print(f"normalize DSEG -> d_sig='{d_sig}', c_sig='{c_sig}', div_sig='{div_sig}'")
