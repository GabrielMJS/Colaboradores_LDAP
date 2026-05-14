"""
Database Service — Conexão com PostgreSQL (siscolaboradores).
Substitui o overrides.json e o Aniversariantes.csv por um banco relacional.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(override=True)

# ---------------------------------------------------------------
# Conexao
# ---------------------------------------------------------------

def _get_conn():
    """Retorna uma conexao com o PostgreSQL usando as variaveis do .env."""
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME", "siscolaboradores"),
        user=os.getenv("DB_USER", "app_sisevento"),
        password=os.getenv("DB_PASSWORD", "app_sisevento"),
        host=os.getenv("DB_HOST", "192.168.53.207"),
        port=os.getenv("DB_PORT", "5432"),
    )


def test_connection():
    """Testa a conexao com o banco. Retorna True se conectou."""
    try:
        conn = _get_conn()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Erro ao conectar ao banco: {e}")
        return False


# ---------------------------------------------------------------
# DEPARTAMENTO
# ---------------------------------------------------------------

def get_all_departamentos():
    """Retorna todos os departamentos ativos."""
    conn = _get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM departamento WHERE ativo = TRUE ORDER BY sigla")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


def get_departamento_by_sigla(sigla: str):
    """Busca um departamento pela sigla."""
    conn = _get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM departamento WHERE sigla = %s", (sigla,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return dict(row) if row else None


def get_siglas_map():
    """Retorna dicionario {NOME_OFICIAL: SIGLA} - substitui o siglas_departamentos.json."""
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("SELECT nome_oficial, sigla FROM departamento WHERE ativo = TRUE")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {row[0]: row[1] for row in rows}


def get_siglas_reverse_map():
    """Retorna dicionario {SIGLA: NOME_OFICIAL} - para converter sigla em nome completo."""
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("SELECT sigla, nome_oficial FROM departamento WHERE ativo = TRUE")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {row[0].strip().upper(): row[1].strip() for row in rows}


# ---------------------------------------------------------------
# COLABORADOR
# ---------------------------------------------------------------

def get_colaborador(username: str):
    """Busca dados enriquecidos de um colaborador pelo username (sAMAccountName)."""
    conn = _get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM colaborador WHERE username = %s", (username,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return dict(row) if row else None


def get_all_colaboradores():
    """Retorna todos os colaboradores do banco."""
    conn = _get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM colaborador ORDER BY nome_completo")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


def upsert_colaborador(username: str, fields: dict):
    """
    Insere ou atualiza um colaborador no banco.
    Campos aceitos: nome_completo, email, ramal, cargo, unidade_sigla,
                    lotacao, data_aniversario, visivel, foto_url,
                    diretoria_sigla, coordenacao_sigla
    """
    CAMPOS_PERMITIDOS = (
        "nome_completo", "email", "ramal", "cargo", "unidade_sigla",
        "lotacao", "data_aniversario", "visivel", "foto_url",
        "diretoria_sigla", "coordenacao_sigla",
    )
    conn = _get_conn()
    cur = conn.cursor()

    cur.execute("SELECT id FROM colaborador WHERE username = %s", (username,))
    existing = cur.fetchone()

    if existing:
        set_parts = []
        values = []
        for key, value in fields.items():
            if key in CAMPOS_PERMITIDOS:
                val_to_set = value.upper() if key == "cargo" and value else value
                set_parts.append(f"{key} = %s")
                values.append(val_to_set)

        if set_parts:
            set_parts.append("atualizado_em = CURRENT_TIMESTAMP")
            values.append(username)
            sql = f"UPDATE colaborador SET {', '.join(set_parts)} WHERE username = %s"
            cur.execute(sql, values)
    else:
        cols = ["username"]
        vals = [username]
        placeholders = ["%s"]

        for key, value in fields.items():
            if key in CAMPOS_PERMITIDOS:
                val_to_set = value.upper() if key == "cargo" and value else value
                cols.append(key)
                vals.append(val_to_set)
                placeholders.append("%s")

        sql = f"INSERT INTO colaborador ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
        cur.execute(sql, vals)

    conn.commit()
    cur.close()
    conn.close()


def delete_colaborador_overrides(username: str):
    """Remove um colaborador do banco (reseta customizacoes)."""
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM colaborador WHERE username = %s", (username,))
    conn.commit()
    cur.close()
    conn.close()


def apply_db_overrides(colaboradores: list, filter_hidden: bool = True) -> list:
    """
    Mescla a lista do LDAP com os dados enriquecidos do banco PostgreSQL.
    Prioridade: banco (admin) > LDAP.
    Diretoria e coordenação são lidas do banco quando disponíveis.
    """
    conn = _get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM colaborador")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    db_map = {row["username"]: dict(row) for row in rows}

    result = []
    for c in colaboradores:
        username = c.get("sAMAccountName", "")
        db_data = db_map.get(username, {})

        # Campos do banco sobrescrevem LDAP (se admin editou)
        if db_data.get("ramal"):
            c["telephoneNumber"] = db_data["ramal"]
        if db_data.get("cargo"):
            c["title"] = db_data["cargo"]
        if db_data.get("unidade_sigla"):
            c["ou"] = db_data["unidade_sigla"]
        if db_data.get("lotacao"):
            c["department"] = db_data["lotacao"]
        if db_data.get("data_aniversario"):
            c["data_aniversario"] = db_data["data_aniversario"]
        if db_data.get("foto_url"):
            c["foto"] = db_data["foto_url"]

        # Diretoria e Coordenação: banco tem prioridade (admin pode sobrescrever)
        # mas se não estiver no banco ainda, será preenchido pelo normalize_departments
        if db_data.get("diretoria_sigla"):
            c["_db_diretoria_sigla"] = db_data["diretoria_sigla"]
        if db_data.get("coordenacao_sigla"):
            c["_db_coordenacao_sigla"] = db_data["coordenacao_sigla"]

        c["_overrides"] = {k: v for k, v in db_data.items()
                          if k not in ("id", "criado_em", "atualizado_em", "departamento_id")
                          and v is not None}
        c["_in_db"] = bool(db_data)
        c["visivel"] = db_data.get("visivel", True) if db_data else True

        if filter_hidden and c["visivel"] is False:
            continue

        result.append(c)
    return result

def backfill_lotacoes():
    """
    Preenche o campo 'lotacao' (nome completo) de colaboradores que tem apenas a sigla,
    baseado na tabela 'departamento'.
    """
    conn = _get_conn()
    cur = conn.cursor()
    
    # SQL que atualiza a lotacao baseada na sigla se a lotacao estiver vazia ou nula
    # E tambem aproveita para deixar os cargos em MAIUSCULO
    sql_lotacao = """
        UPDATE colaborador c
        SET lotacao = d.nome_oficial
        FROM departamento d
        WHERE c.unidade_sigla = d.sigla
          AND (c.lotacao IS NULL OR c.lotacao = '' OR c.lotacao = '—')
    """
    sql_cargo = "UPDATE colaborador SET cargo = UPPER(cargo) WHERE cargo IS NOT NULL"
    
    try:
        cur.execute(sql_lotacao)
        lot_count = cur.rowcount
        cur.execute(sql_cargo)
        cargo_count = cur.rowcount
        conn.commit()
        print(f"[DB] Cleanup: {lot_count} lotações preenchidas, {cargo_count} cargos em maiúsculo.")
        return lot_count
    except Exception as e:
        print(f"[DB] Erro no backfill de lotações: {e}")
        conn.rollback()
        return 0
    finally:
        cur.close()
        conn.close()

# ---------------------------------------------------------------
# DEPARTMENTS NORMALIZATION
# ---------------------------------------------------------------

# Mapeamento sigla coordenação → sigla diretoria (extraído do Excel Força de Trabalho AEB)
COOR_TO_DIR = {
    # Presidência
    'PRE': 'PRE',
    # Unidades Regionais (são diretorias em si mesmas)
    'URMA': 'URMA', 'URRN': 'URRN', 'URSJC': 'URSJC',
    # Gabinete e subordinadas
    'GAB': 'GAB', 'OUV': 'GAB',
    # Assessoria de Relações Institucionais
    'ARI': 'ARI', 'CCS': 'ARI', 'CRI': 'ARI',
    # Outros órgãos autônomos
    'PF': 'PF', 'ACI': 'ACI', 'AUDIN': 'AUDIN',
    # DPOA — Diretoria de Planejamento, Orçamento e Administração
    'DPOA': 'DPOA', 'COF': 'DPOA', 'CTI': 'DPOA',
    'CGP': 'DPOA', 'COAD': 'DPOA',
    # DGSE — Diretoria de Governança do Setor Espacial
    'DGSE': 'DGSE', 'CMA': 'DGSE', 'CPP': 'DGSE', 'CEG': 'DGSE',
    # DGEP — Diretoria de Gestão de Portfólio
    'DGEP': 'DGEP', 'CSS': 'DGEP', 'CVL': 'DGEP', 'CSA': 'DGEP',
    # DIEN — Diretoria de Novos Negócios (Inovação Espacial)
    'DIEN': 'DIEN', 'CDT': 'DIEN', 'CEN': 'DIEN', 'CLC': 'DIEN',
    # Situações especiais
    'REQUISITADO': 'REQUISITADO',
    'CEDIDO (A)': 'CEDIDO', 'CEDIDO': 'CEDIDO',
    'MOVIMENTADO': 'MOVIMENTADO',
    # Legados/aliases
    'CTIC': 'DPOA', 'DSG': 'DGSE', 'DIPA': 'DPOA',
}

def normalize_departments(colaboradores: list) -> list:
    """
    Normaliza a lotação (department) de todos os colaboradores usando
    a lista oficial de departamentos do banco via fuzzy matching.
    """
    import difflib
    siglas_dict = get_siglas_map()
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
        
        # Populate Diretoria information
        # Prioridade: valor do banco (admin) > cálculo pelo COOR_TO_DIR
        if c.get("_db_diretoria_sigla"):
            dir_sigla = c["_db_diretoria_sigla"]
        else:
            final_ou = c.get("ou", "")
            dir_sigla = COOR_TO_DIR.get(final_ou.upper(), final_ou)

        c["diretoria_sigla"] = dir_sigla

        if c.get("_db_coordenacao_sigla"):
            c["ou"] = c["_db_coordenacao_sigla"]

        reverse_map = {v: k for k, v in siglas_dict.items()}
        c["diretoria"] = reverse_map.get(dir_sigla.upper(), dir_sigla)
        c["unidade"] = c.get("ou", "")
        c["lotacao"] = c.get("department", "")

    return colaboradores

# ---------------------------------------------------------------
# LOG_ASSINATURA
# ---------------------------------------------------------------

def registrar_assinatura(colaborador_username: str, capa: str, gerado_por: str):
    """Registra que uma assinatura foi gerada."""
    conn = _get_conn()
    cur = conn.cursor()

    # Busca o ID do colaborador
    cur.execute("SELECT id FROM colaborador WHERE username = %s", (colaborador_username,))
    row = cur.fetchone()

    if row:
        cur.execute(
            "INSERT INTO log_assinatura (colaborador_id, capa_utilizada, gerado_por) VALUES (%s, %s, %s)",
            (row[0], capa, gerado_por)
        )
    conn.commit()
    cur.close()
    conn.close()


def get_logs_assinatura(limit: int = 50):
    """Retorna os ultimos logs de assinaturas geradas."""
    conn = _get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT la.id, c.username, c.nome_completo, la.capa_utilizada, 
               la.gerado_em, la.gerado_por
        FROM log_assinatura la
        JOIN colaborador c ON c.id = la.colaborador_id
        ORDER BY la.gerado_em DESC
        LIMIT %s
    """, (limit,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------
# LOG_ALTERACAO (Auditoria)
# ---------------------------------------------------------------

def registrar_alteracao(colaborador_username: str, campo: str,
                        valor_anterior: str, valor_novo: str, alterado_por: str):
    """Registra uma alteracao feita pelo admin para auditoria."""
    conn = _get_conn()
    cur = conn.cursor()

    cur.execute("SELECT id FROM colaborador WHERE username = %s", (colaborador_username,))
    row = cur.fetchone()

    if row:
        cur.execute(
            """INSERT INTO log_alteracao 
               (colaborador_id, campo_alterado, valor_anterior, valor_novo, alterado_por) 
               VALUES (%s, %s, %s, %s, %s)""",
            (row[0], campo, valor_anterior, valor_novo, alterado_por)
        )
    conn.commit()
    cur.close()
    conn.close()


def get_logs_alteracao(limit: int = 100):
    """Retorna os ultimos logs de alteracoes."""
    conn = _get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT la.id, c.username, c.nome_completo, la.campo_alterado,
               la.valor_anterior, la.valor_novo, la.alterado_por, la.alterado_em
        FROM log_alteracao la
        JOIN colaborador c ON c.id = la.colaborador_id
        ORDER BY la.alterado_em DESC
        LIMIT %s
    """, (limit,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------
# MIGRAR dados existentes (overrides.json + CSV)
# ---------------------------------------------------------------

def migrar_dados_existentes():
    """
    Importa dados do overrides.json e Aniversariantes.csv para o banco.
    Roda uma vez so para fazer a migracao inicial.
    """
    import json
    import csv

    overrides_path = os.path.join(os.path.dirname(__file__), "overrides.json")
    csv_path = os.path.join(os.path.dirname(__file__), "aniversariantes.csv")

    conn = _get_conn()
    cur = conn.cursor()

    migrados = 0

    # 1. Importar dados do CSV de aniversariantes
    if os.path.exists(csv_path):
        try:
            with open(csv_path, "r", encoding="latin-1") as f:
                reader = csv.reader(f, delimiter=";")
                next(reader, None)  # pula header
                for row in reader:
                    if len(row) >= 4:
                        data_aniv, nome, email, unidade = row[0].strip(), row[1].strip(), row[2].strip(), row[3].strip()
                        login = email.split("@")[0] if "@" in email else ""

                        if login:
                            cur.execute("SELECT id FROM colaborador WHERE username = %s", (login,))
                            if not cur.fetchone():
                                cur.execute(
                                    """INSERT INTO colaborador 
                                       (username, nome_completo, email, unidade_sigla, data_aniversario, visivel) 
                                       VALUES (%s, %s, %s, %s, %s, TRUE)""",
                                    (login, nome, email, unidade, data_aniv)
                                )
                                migrados += 1
                            else:
                                cur.execute(
                                    """UPDATE colaborador 
                                       SET data_aniversario = %s, unidade_sigla = COALESCE(unidade_sigla, %s)
                                       WHERE username = %s AND data_aniversario IS NULL""",
                                    (data_aniv, unidade, login)
                                )
        except Exception as e:
            print(f"Erro ao importar CSV: {e}")

    # 2. Importar dados do overrides.json
    if os.path.exists(overrides_path):
        try:
            with open(overrides_path, "r", encoding="utf-8") as f:
                overrides = json.load(f)

            for username, ov in overrides.items():
                cur.execute("SELECT id FROM colaborador WHERE username = %s", (username,))
                existing = cur.fetchone()

                fields_to_update = {}
                if "ramal" in ov:
                    fields_to_update["ramal"] = ov["ramal"]
                if "cargo" in ov:
                    fields_to_update["cargo"] = ov["cargo"]
                if "unidade" in ov:
                    fields_to_update["unidade_sigla"] = ov["unidade"]
                if "visivel" in ov:
                    fields_to_update["visivel"] = ov["visivel"]
                if "data_aniversario" in ov:
                    fields_to_update["data_aniversario"] = ov["data_aniversario"]

                if existing and fields_to_update:
                    set_parts = [f"{k} = %s" for k in fields_to_update]
                    set_parts.append("atualizado_em = CURRENT_TIMESTAMP")
                    vals = list(fields_to_update.values()) + [username]
                    cur.execute(
                        f"UPDATE colaborador SET {', '.join(set_parts)} WHERE username = %s",
                        vals
                    )
                elif not existing:
                    fields_to_update["username"] = username
                    cols = list(fields_to_update.keys())
                    vals = list(fields_to_update.values())
                    placeholders = ["%s"] * len(vals)
                    cur.execute(
                        f"INSERT INTO colaborador ({', '.join(cols)}) VALUES ({', '.join(placeholders)})",
                        vals
                    )
                    migrados += 1
        except Exception as e:
            print(f"Erro ao importar overrides: {e}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"[OK] Migracao concluida. {migrados} registros criados/atualizados.")
    return migrados


if __name__ == "__main__":
    print("Testando conexao com o banco...")
    if test_connection():
        print("[OK] Conexao com PostgreSQL estabelecida!")
        print()
        print("Departamentos cadastrados:")
        for d in get_all_departamentos():
            print(f"  {d['sigla']:15s} | {d['nome_oficial']}")
    else:
        print("[ERRO] Nao foi possivel conectar ao banco.")
