import os
import sys

from app.database_service import get_departamento_hierarchy, resolve_hierarchy

dept_dict = get_departamento_hierarchy()
path = []
current = "DSEG"
while current and current in dept_dict:
    path.append(dept_dict[current])
    current = dept_dict[current]["diretoria_pai"]

print(f"Path before reverse: {[p['sigla'] for p in path]}")
path.reverse()
print(f"Path after reverse: {[p['sigla'] for p in path]}")

d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("DSEG", dept_dict)
print(f"DSEG -> d_sig: '{d_sig}', c_sig: '{c_sig}', div_sig: '{div_sig}'")

d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("CTI", dept_dict)
print(f"CTI -> d_sig: '{d_sig}', c_sig: '{c_sig}', div_sig: '{div_sig}'")

d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("SUP", dept_dict)
print(f"SUP -> d_sig: '{d_sig}', c_sig: '{c_sig}', div_sig: '{div_sig}'")

d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("DPOA", dept_dict)
print(f"DPOA -> d_sig: '{d_sig}', c_sig: '{c_sig}', div_sig: '{div_sig}'")
