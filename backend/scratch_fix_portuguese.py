import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def fix_portuguese_writing():
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME", "siscolaboradores"),
        user=os.getenv("DB_USER", "app_colaboradores"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
    )
    cur = conn.cursor()
    
    # Lista de correções oficiais (Sigla: Nome Correto)
    departamentos = {
        "PRE": "Presidência",
        "GAB": "Gabinete",
        "AUDIN": "Auditoria Interna",
        "OUV": "Ouvidoria",
        "PF": "Procuradoria Federal",
        "DAP": "Divisão de Análise e Pareceres",
        "ACI": "Assessoria de Cooperação Internacional",
        "ARI": "Assessoria de Relações Institucionais e Comunicações",
        "CRI": "Coordenação de Relações Institucionais",
        "DAE": "Divisão de Apoio Institucional",
        "CCS": "Coordenação de Comunicação Social",
        "SAA": "Serviço de Assistência Administrativa",
        "SEAD": "Serviço de Assistência à Ouvidoria",
        "DPOA": "Diretoria de Planejamento, Orçamento e Administração",
        "DEDH": "Divisão de Estratégia de Desenvolvimento Humano",
        "DIPA": "Divisão de Planejamento e Aquisições",
        "CTI": "Coordenação de Tecnologia da Informação",
        "COF": "Coordenação de Orçamento e Finanças",
        "CGP": "Coordenação de Gestão de Pessoas",
        "COAD": "Coordenação de Administração",
        "DIEN": "Diretoria de Inteligência Estratégica e Novos Negócios",
        "CLC": "Coordenação de Licenciamento, Normas e Comercialização",
        "CEN": "Coordenação de Estudos Estratégicos e Novos Negócios",
        "CDT": "Coordenação de Desenvolvimento de Competências e Tecnologia",
        "DGSE": "Diretoria de Governança do Setor Espacial",
        "CPP": "Coordenação de Políticas e Programas",
        "CMA": "Coordenação de Monitoramento e Avaliação",
        "CEG": "Coordenação de Estrutura e Governança",
        "DGEP": "Diretoria de Gestão de Portfólio",
        "CSS": "Coordenação de Segmento de Solo",
        "CSA": "Coordenação de Satélites e Aplicações",
        "CVL": "Coordenação de Veículos Lançadores",
        "URSJC": "Unidade Regional de São José dos Campos",
        "URRN": "Unidade Regional do Rio Grande do Norte",
        "URMA": "Unidade Regional de Alcântara",
        "URNN": "Unidade Regional de Natal",
    }

    try:
        print("[FIX] Atualizando nomes dos departamentos para Português correto...")
        for sigla, nome in departamentos.items():
            cur.execute(
                "UPDATE departamento SET nome_oficial = %s WHERE sigla = %s",
                (nome, sigla)
            )
        
        print("[FIX] Forçando atualização nas lotações dos colaboradores...")
        # Atualiza a lotacao de todos os colaboradores baseando-se no novo nome oficial
        cur.execute("""
            UPDATE colaborador c
            SET lotacao = d.nome_oficial
            FROM departamento d
            WHERE c.unidade_sigla = d.sigla
        """)
        
        conn.commit()
        print("[OK] Linguagem portuguesa padronizada com sucesso!")
    except Exception as e:
        print(f"[ERRO] {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    fix_portuguese_writing()
