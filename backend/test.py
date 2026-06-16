import sys
import os
sys.path.insert(0, os.path.abspath('app'))

import psycopg2.extras
from app.database_service import get_db_conn

with get_db_conn() as conn:
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM colaborador WHERE username='gabriel.silva'")
    print("USER GABRIEL:")
    print(cur.fetchall())
    
    cur.execute("SELECT * FROM departamento")
    print("DEPARTAMENTOS:")
    for d in cur.fetchall():
        if d['sigla'] in ['CTI', 'CTIC', 'DPSC']:
            print(d)
