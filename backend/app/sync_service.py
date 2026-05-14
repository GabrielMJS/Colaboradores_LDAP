"""
Sync Service — Sincroniza usuarios do LDAP com o banco PostgreSQL.

Fluxo:
  1. Busca TODOS os usuarios ativos no LDAP
  2. Para cada usuario, cria ou atualiza o registro no banco
  3. Campos do LDAP (nome, email, cargo, departamento) sao sempre atualizados
  4. Campos de OVERRIDE do admin (ramal editado, visibilidade, aniversario) sao PRESERVADOS
  5. Usuarios que sumiram do LDAP podem ser marcados como inativos
"""

import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from ldap_service import LDAPService
from database_service import _get_conn, backfill_lotacoes, COOR_TO_DIR
from dotenv import load_dotenv

load_dotenv()


def sync_ldap_to_db():
    """
    Sincroniza todos os usuarios ativos do LDAP para a tabela 'colaborador'.
    - Insere novos colaboradores
    - Atualiza nome, email, cargo, departamento, unidade dos existentes
    - NAO sobrescreve campos que o admin customizou (ramal, visivel, data_aniversario,
      diretoria_sigla, coordenacao_sigla)
    """
    print("[SYNC] Conectando ao LDAP...")
    service = LDAPService()
    ldap_users = service.search_all_users()
    print(f"[SYNC] {len(ldap_users)} usuarios ativos encontrados no LDAP.")

    conn = _get_conn()
    cur = conn.cursor()

    inseridos = 0
    atualizados = 0
    erros = 0

    for user in ldap_users:
        username = user.get("sAMAccountName", "").strip()
        if not username:
            continue

        nome = user.get("displayName") or user.get("cn") or ""
        email = user.get("mail") or ""
        cargo_ldap = user.get("title") or ""
        dept_ldap = user.get("department") or ""

        # ou: usa atributo direto; se vazio, extrai do DN (padrão no AD)
        ou_attr = (user.get("ou") or "").strip()
        if not ou_attr:
            import re
            dn = user.get("distinguishedName") or user.get("dn") or ""
            m = re.search(r"(?i)OU=([^,]+)", dn)
            ou_attr = m.group(1).strip() if m else ""
        ou_ldap = ou_attr.upper()

        # Calcula diretoria e coordenacao a partir da sigla da unidade
        dir_sigla = COOR_TO_DIR.get(ou_ldap, ou_ldap) if ou_ldap else ""
        coor_sigla = ou_ldap

        try:
            cur.execute(
                "SELECT id FROM colaborador WHERE username = %s", (username,)
            )
            existing = cur.fetchone()

            if existing:
                # UPDATE — atualiza campos do LDAP, preserva overrides do admin com COALESCE
                cur.execute("""
                    UPDATE colaborador
                    SET nome_completo     = %s,
                        email            = %s,
                        cargo            = COALESCE(cargo, %s),
                        lotacao          = COALESCE(lotacao, %s),
                        unidade_sigla    = COALESCE(unidade_sigla, %s),
                        diretoria_sigla  = COALESCE(diretoria_sigla, %s),
                        coordenacao_sigla = COALESCE(coordenacao_sigla, %s),
                        atualizado_em    = CURRENT_TIMESTAMP
                    WHERE username = %s
                """, (
                    nome, email,
                    cargo_ldap.upper() if cargo_ldap else None,
                    dept_ldap, ou_ldap,
                    dir_sigla or None,
                    coor_sigla or None,
                    username
                ))
                atualizados += 1
            else:
                # INSERT — novo colaborador
                cur.execute("""
                    INSERT INTO colaborador
                        (username, nome_completo, email, cargo, lotacao,
                         unidade_sigla, diretoria_sigla, coordenacao_sigla, visivel)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                """, (
                    username, nome, email,
                    cargo_ldap.upper() if cargo_ldap else None,
                    dept_ldap, ou_ldap,
                    dir_sigla or None,
                    coor_sigla or None,
                ))
                inseridos += 1

        except Exception as e:
            erros += 1
            print(f"[SYNC] Erro ao processar '{username}': {e}")
            conn.rollback()
            conn = _get_conn()
            cur = conn.cursor()

    conn.commit()
    cur.close()
    conn.close()

    print(f"[SYNC] Concluido: {inseridos} novos, {atualizados} atualizados, {erros} erros.")
    return {"inseridos": inseridos, "atualizados": atualizados, "erros": erros}


# Removed sync_csv_aniversarios as we now rely on DB


def full_sync():
    """Executa sincronizacao completa: LDAP + CSV de aniversarios."""
    print("=" * 50)
    print("  SINCRONIZACAO COMPLETA")
    print("=" * 50)
    print()

    print("Etapa 1: LDAP -> Banco de Dados")
    result = sync_ldap_to_db()
    print()

    print("Etapa 2: Preenchimento de Lotações vazias (Backfill)")
    backfill_count = backfill_lotacoes()
    print(f"[SYNC] {backfill_count} lotações corrigidas no banco.")
    print()



    print("=" * 50)
    print("  SYNC CONCLUIDO!")
    print("=" * 50)

    return result


if __name__ == "__main__":
    full_sync()
