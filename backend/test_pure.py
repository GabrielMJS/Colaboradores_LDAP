from app.database_service import COOR_TO_DIR, resolve_hierarchy

dept_dict = {
    "DSEG": {"sigla": "DSEG", "diretoria_pai": "CTI", "nome_oficial": "Divisao Seg"},
    "CTI": {"sigla": "CTI", "diretoria_pai": "DPOA", "nome_oficial": "Coordenacao TI"},
    "DPOA": {"sigla": "DPOA", "diretoria_pai": "PRE", "nome_oficial": "Diretoria POA"},
    "PRE": {"sigla": "PRE", "diretoria_pai": None, "nome_oficial": "Presidencia"}
}

print("SCENARIO 1: All nodes present (PRE -> DPOA -> CTI -> DSEG)")
d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("DSEG", dept_dict)
print(f"Result: {d_sig}, {c_sig}, {div_sig}")

print("SCENARIO 2: PRE is missing from dept_dict (DPOA -> CTI -> DSEG)")
dept_dict2 = {
    "DSEG": {"sigla": "DSEG", "diretoria_pai": "CTI", "nome_oficial": "Divisao Seg"},
    "CTI": {"sigla": "CTI", "diretoria_pai": "DPOA", "nome_oficial": "Coordenacao TI"},
    "DPOA": {"sigla": "DPOA", "diretoria_pai": "PRE", "nome_oficial": "Diretoria POA"}
}
d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("DSEG", dept_dict2)
print(f"Result: {d_sig}, {c_sig}, {div_sig}")

print("SCENARIO 3: DPOA is missing from dept_dict (CTI -> DSEG)")
dept_dict3 = {
    "DSEG": {"sigla": "DSEG", "diretoria_pai": "CTI", "nome_oficial": "Divisao Seg"},
    "CTI": {"sigla": "CTI", "diretoria_pai": "DPOA", "nome_oficial": "Coordenacao TI"}
}
d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("DSEG", dept_dict3)
print(f"Result: {d_sig}, {c_sig}, {div_sig}")

print("SCENARIO 4: DSEG has no diretoria_pai")
dept_dict4 = {
    "DSEG": {"sigla": "DSEG", "diretoria_pai": None, "nome_oficial": "Divisao Seg"}
}
d_sig, c_sig, div_sig, d_nom, c_nom, div_nom = resolve_hierarchy("DSEG", dept_dict4)
print(f"Result: {d_sig}, {c_sig}, {div_sig}")
