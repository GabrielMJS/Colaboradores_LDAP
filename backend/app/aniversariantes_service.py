import csv
import os

CSV_FILE = os.path.join(os.path.dirname(__file__), "aniversariantes.csv")

def _load_aniversariantes() -> dict:
    if not os.path.exists(CSV_FILE):
        return {}
    
    data = {}
    try:
        # Tenta ler com encoding latin-1 que costuma ser comum em CSVs do Excel em português
        with open(CSV_FILE, "r", encoding="latin-1") as f:
            reader = csv.reader(f, delimiter=";")
            next(reader, None)  # pula o header
            for row in reader:
                if len(row) >= 4:
                    dia_mes, nome, email, unidade = row[0], row[1], row[2], row[3]
                    email_lower = email.strip().lower()
                    login_csv = email_lower.split("@")[0] if "@" in email_lower else email_lower
                    nome_lower = nome.strip().lower()
                    
                    if email_lower:
                        entry = {
                            "data_aniversario": dia_mes.strip(),
                            "nome": nome.strip(),
                            "unidade": unidade.strip()
                        }
                        data[email_lower] = entry
                        data[login_csv] = entry
                        data[nome_lower] = entry
    except Exception as e:
        print(f"Erro ao ler aniversariantes.csv: {e}")
        pass
    return data

def _load_siglas_dict() -> dict:
    import json
    # O arquivo está em frontend/public/siglas_departamentos.json
    siglas_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "siglas_departamentos.json")
    try:
        with open(siglas_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Erro ao ler siglas_departamentos.json: {e}")
        return {}

def _load_siglas_reverse_map() -> dict:
    data = _load_siglas_dict()
    reverse_map = {}
    for full_name, sigla in data.items():
        reverse_map[sigla.strip().upper()] = full_name.strip()
    return reverse_map

def normalize_departments(colaboradores: list) -> list:
    """
    Normaliza a lotação (department) de todos os colaboradores usando
    a lista oficial de departamentos de siglas_departamentos.json via fuzzy matching.
    """
    import difflib
    siglas_dict = _load_siglas_dict()
    secoes_oficiais = list(siglas_dict.keys())

    for c in colaboradores:
        # Substituição da sigla CTIC por CTI
        ou = c.get("ou", "")
        if ou:
            ou_upper = ou.strip().upper()
            if ou_upper == "CTIC":
                c["ou"] = "CTI"
            elif ou_upper in ["DSG", "DGSE"]:
                c["ou"] = "DGSE"
                c["department"] = "DIRETORIA DE GOVERNANÇA DO SETOR ESPACIAL"
            elif ou_upper == "DIPA":
                c["ou"] = "DIPA"
                c["department"] = "DIVISÃO DE PLANEJAMENTO E AQUISIÇÕES"

        dept = c.get("department", "")
        if dept:
            # Substituições manuais solicitadas
            if dept.upper() == "COORDENAÇÃO DE TECNOLOGIA DA INFORMAÇÃO E COMUNICAÇÃO":
                dept = "COORDENAÇÃO DE TECNOLOGIA DA INFORMAÇÃO"
            
            if dept.upper() == "DIRETORIA DE PLANEJAMENTO,ORÇAMENTO,ADMINISTRAÇÃO":
                dept = "DIRETORIA DE PLANEJAMENTO, ORÇAMENTO e ADMINISTRAÇÃO"

            # Encontra a correspondência mais próxima (80% de similaridade mínima)
            matches = difflib.get_close_matches(dept, secoes_oficiais, n=1, cutoff=0.7)
            if matches:
                normalized_name = matches[0]
                c["department"] = normalized_name
            else:
                normalized_name = dept
                c["department"] = dept
            
            # Tenta preencher a sigla (ou) se estiver vazia ou se conseguirmos uma sigla melhor via mapa
            sigla = siglas_dict.get(normalized_name)
            if sigla:
                c["ou"] = sigla
            elif not c.get("ou"):
                c["ou"] = "—" # Fallback visual se realmente não tivermos nada
                
    return colaboradores

def apply_aniversariantes_data(colaboradores: list) -> list:
    """
    Acrescenta unidade e data_aniversario aos colaboradores a partir da planilha.
    """
    aniv_data = _load_aniversariantes()
    if not aniv_data:
        return colaboradores

    siglas_map = _load_siglas_reverse_map()

    for c in colaboradores:
        email = c.get("mail", "") or ""
        email_lower = email.strip().lower()
        
        sam_account = c.get("sAMAccountName", "") or ""
        sam_lower = sam_account.strip().lower()
        
        display_name = c.get("displayName", "") or c.get("cn", "") or ""
        name_lower = display_name.strip().lower()
        
        matched_entry = None
        if email_lower and email_lower in aniv_data:
            matched_entry = aniv_data[email_lower]
        elif sam_lower and sam_lower in aniv_data:
            matched_entry = aniv_data[sam_lower]
        elif name_lower and name_lower in aniv_data:
            matched_entry = aniv_data[name_lower]

        if matched_entry:
            c["_in_csv"] = True
            # Sobrescreve/preenche unidade se estiver no CSV
            unidade = matched_entry["unidade"]
            if unidade:
                # Substituições de sigla vindas do CSV
                unid_upper = unidade.strip().upper()
                if unid_upper == "CTIC":
                    unidade = "CTI"
                elif unid_upper in ["DSG", "DGSE"]:
                    unidade = "DGSE"
                elif unid_upper == "DIPA":
                    unidade = "DIPA"
                    
                c["ou"] = unidade
                # Mapeia a unidade para a lotação e seta em 'department'
                lotacao = siglas_map.get(unidade.strip().upper())
                if lotacao:
                    c["department"] = lotacao
                    
            if "data_aniversario" not in c.get("_overrides", {}):
                c["data_aniversario"] = matched_entry["data_aniversario"]
        else:
            c["_in_csv"] = False
            
    return colaboradores

def get_aniversariantes(meses: list) -> list:
    """
    Retorna a lista de aniversariantes que caem nos meses passados (ex: ["01", "02"])
    Apenas ativos deverão ser cruzados no main.py, então vamos retornar todos e cruzar lá, ou cruzar aqui.
    Melhor retornar todos os dados do CSV.
    """
    return _load_aniversariantes()
