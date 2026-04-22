"""
Overrides Service — persiste customizações dos colaboradores feitas pelo admin.
Salva em backend/overrides.json (simples, sem banco de dados).
"""

import json
import os

OVERRIDES_FILE = os.path.join(os.path.dirname(__file__), "overrides.json")


def _load() -> dict:
    if not os.path.exists(OVERRIDES_FILE):
        return {}
    try:
        with open(OVERRIDES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save(data: dict):
    with open(OVERRIDES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_all_overrides() -> dict:
    """Retorna todas as customizações salvas. Chave = sAMAccountName."""
    return _load()


def get_override(username: str) -> dict:
    """Retorna customizações de um usuário específico."""
    return _load().get(username, {})


def save_override(username: str, fields: dict):
    """
    Salva/atualiza campos customizados de um colaborador.
    Campos aceitos: ramal, cargo, unidade, visivel
    """
    data = _load()
    if username not in data:
        data[username] = {}
    data[username].update(fields)
    _save(data)


def delete_override(username: str):
    """Remove todas as customizações de um colaborador."""
    data = _load()
    if username in data:
        del data[username]
        _save(data)


def apply_overrides(colaboradores: list) -> list:
    """
    Mescla a lista do LDAP com as customizações salvas.
    Filtra colaboradores com visivel=False.
    """
    overrides = _load()
    result = []
    for c in colaboradores:
        username = c.get("sAMAccountName", "")
        ov = overrides.get(username, {})

        # Aplica overrides nos campos
        if "ramal" in ov:
            c["telephoneNumber"] = ov["ramal"]
        if "cargo" in ov:
            c["title"] = ov["cargo"]
        if "unidade" in ov:
            c["ou"] = ov["unidade"]

        # Adiciona flag de override para o frontend saber o que foi editado
        c["_overrides"] = ov

        # Filtra se admin ocultou o colaborador
        if ov.get("visivel") is False:
            continue

        result.append(c)
    return result
