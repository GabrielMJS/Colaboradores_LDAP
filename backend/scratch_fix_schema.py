import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def fix_schema():
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME", "siscolaboradores"),
        user=os.getenv("DB_USER", "app_colaboradores"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
    )
    cur = conn.cursor()
    try:
        print("Alterando coluna foto_url para TEXT...")
        cur.execute("ALTER TABLE colaborador ALTER COLUMN foto_url TYPE TEXT")
        
        # Aproveita para garantir que outros campos longos sejam TEXT
        print("Alterando lotacao e cargo para TEXT por seguranca...")
        cur.execute("ALTER TABLE colaborador ALTER COLUMN lotacao TYPE TEXT")
        cur.execute("ALTER TABLE colaborador ALTER COLUMN cargo TYPE TEXT")
        
        conn.commit()
        print("Schema atualizado com sucesso!")
    except Exception as e:
        print(f"Erro ao atualizar schema: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    fix_schema()
