import sys
import os
sys.path.insert(0, os.path.abspath('app'))

import psycopg2.extras
from app.database_service import get_db_conn, get_siglas_reverse_map

reverse_map = get_siglas_reverse_map()

with get_db_conn() as conn:
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT username, diretoria_sigla, coordenacao_sigla FROM colaborador WHERE diretoria_sigla IS NOT NULL OR coordenacao_sigla IS NOT NULL")
    rows = cur.fetchall()
    
    updated = 0
    for row in rows:
        username = row['username']
        d_sig = row['diretoria_sigla']
        c_sig = row['coordenacao_sigla']
        
        needs_update = False
        
        if d_sig and d_sig not in reverse_map:
            print(f"[{username}] Diretoria invalida encontrada: {d_sig}")
            d_sig = None
            needs_update = True
            
        if c_sig and c_sig not in reverse_map:
            print(f"[{username}] Coordenacao invalida encontrada: {c_sig}")
            c_sig = None
            needs_update = True
            
        if needs_update:
            print(f"Atualizando {username} para remover siglas invalidas...")
            cur.execute(
                "UPDATE colaborador SET diretoria_sigla = %s, coordenacao_sigla = %s WHERE username = %s",
                (d_sig, c_sig, username)
            )
            updated += 1
            
    conn.commit()
    print(f"Limpeza concluida. {updated} usuarios corrigidos no banco.")
