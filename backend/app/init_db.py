"""
Script de inicialização do banco de dados SQLite para o sistema AEB Colaboradores.
Cria as tabelas e popula os departamentos oficiais.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "aeb_colaboradores.db")


def init_database():
    """Cria todas as tabelas e popula dados iniciais."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # ==========================================
    # Tabela: departamento
    # ==========================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS departamento (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_oficial    TEXT    NOT NULL UNIQUE,
            sigla           TEXT    NOT NULL UNIQUE,
            diretoria_pai   TEXT,
            ativo           BOOLEAN NOT NULL DEFAULT 1
        )
    """)

    # ==========================================
    # Tabela: colaborador
    # ==========================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS colaborador (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            username          TEXT    NOT NULL UNIQUE,
            nome_completo     TEXT,
            email             TEXT,
            ramal             TEXT,
            cargo             TEXT,
            unidade_sigla     TEXT,
            lotacao           TEXT,
            data_aniversario  TEXT,
            visivel           BOOLEAN NOT NULL DEFAULT 1,
            foto_url          TEXT,
            criado_em         DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (unidade_sigla) REFERENCES departamento(sigla)
        )
    """)

    # ==========================================
    # Tabela: log_assinatura
    # ==========================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS log_assinatura (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            colaborador_id    INTEGER NOT NULL,
            capa_utilizada    TEXT,
            gerado_em         DATETIME DEFAULT CURRENT_TIMESTAMP,
            gerado_por        TEXT    NOT NULL,
            
            FOREIGN KEY (colaborador_id) REFERENCES colaborador(id)
        )
    """)

    # ==========================================
    # Tabela: log_alteracao
    # ==========================================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS log_alteracao (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            colaborador_id    INTEGER NOT NULL,
            campo_alterado    TEXT    NOT NULL,
            valor_anterior    TEXT,
            valor_novo        TEXT,
            alterado_por      TEXT    NOT NULL,
            alterado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (colaborador_id) REFERENCES colaborador(id)
        )
    """)

    # ==========================================
    # Índices para performance
    # ==========================================
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_colaborador_username ON colaborador(username)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_colaborador_unidade ON colaborador(unidade_sigla)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_log_assinatura_colab ON log_assinatura(colaborador_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_log_alteracao_colab ON log_alteracao(colaborador_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_log_alteracao_data ON log_alteracao(alterado_em)")

    # ==========================================
    # Dados iniciais: Departamentos oficiais
    # ==========================================
    departamentos = [
        # Presidência e órgãos vinculados
        ("PRESIDÊNCIA", "PRE", None),
        ("CONSELHO SUPERIOR", "CONSELHO SUPERIOR", "PRE"),
        ("AUDITORIA INTERNA", "AUDIN", "PRE"),
        ("GABINETE", "GAB", "PRE"),
        ("SERVIÇO DE ASSISTÊNCIA ADMINISTRATIVA", "SAA", "GAB"),
        ("SERVIÇO DE ASSISTÊNCIA A OUVIDORIA", "SEAD", "GAB"),
        ("OUVIDORIA", "OUV", "PRE"),
        ("PROCURADORIA FEDERAL", "PF", "PRE"),

        # Assessorias
        ("DIVISÃO DE ANÁLISE E PARECERES", "DAP", "PF"),
        ("ASSESSORIA DE COOPERAÇÃO INTERNACIONAL", "ACI", "PRE"),
        ("ASSESSORIA DE RELAÇÕES INSTITUCIONAIS E COMUNICAÇÕES", "ARI", "PRE"),
        ("COORDENAÇÃO DE RELAÇÕES INSTITUCIONAIS", "CRI", "ARI"),
        ("DIVISÃO DE APOIO INSTITUCIONAL", "DAE", "PRE"),
        ("COORDENAÇÃO DE COMUNICAÇÃO SOCIAL", "CCS", "ARI"),

        # Unidades Regionais
        ("UNIDADE REGIONAL DE SÃO JOSÉ DOS CAMPOS", "URSJC", "PRE"),
        ("UNIDADE REGIONAL DO NATAL/RN", "URRN", "PRE"),
        ("UNIDADE REGIONAL DE ALCÂNTARA", "URMA", "PRE"),
        ("UNIDADE REGIONAL DE NATAL", "URNN", "PRE"),

        # DPOA
        ("DIRETORIA DE PLANEJAMENTO, ORÇAMENTO e ADMINISTRAÇÃO", "DPOA", "PRE"),
        ("Divisão de Estratégia de Desenvolvimento Humano", "DEDH", "DPOA"),
        ("DIVISÃO DE PLANEJAMENTO E AQUISIÇÕES", "DIPA", "DPOA"),
        ("COORDENAÇÃO DE TECNOLOGIA DA INFORMAÇÃO", "CTI", "DPOA"),
        ("COORDENAÇÃO DE ORÇAMENTO E FINANÇAS", "COF", "DPOA"),
        ("COORDENAÇÃO DE GESTÃO DE PESSOAS", "CGP", "DPOA"),
        ("COORDENAÇÃO DE ADMINISTRAÇÃO", "COAD", "DPOA"),

        # DIEN
        ("DIRETORIA DE INTELIGÊNCIA ESTRATÉGICA E NOVOS NEGÓCIOS", "DIEN", "PRE"),
        ("COORDENAÇÃO DE LICENCIAMENTO, NORMAS E COMERCIALIZAÇÃO", "CLC", "DIEN"),
        ("COORDENAÇÃO DE ESTUDO ESTRATÉGICOS E NOVOS NEGÓCIOS", "CEN", "DIEN"),
        ("COORDENAÇÃO DE DESENVOLVIMENTO DE COMPETÊNCIAS E TECNOLOGIA", "CDT", "DIEN"),

        # DGSE
        ("DIRETORIA DE GOVERNANÇA DO SETOR ESPACIAL", "DGSE", "PRE"),
        ("COORDENAÇÃO DE POLÍTICAS E PROGRAMAS", "CPP", "DGSE"),
        ("COORDENAÇÃO DE MONITORAMENTO E AVALIAÇÃO", "CMA", "DGSE"),
        ("COORDENAÇÃO DE ESTRUTURA E GOVERNANÇA", "CEG", "DGSE"),

        # DGEP
        ("DIRETORIA DE GESTÃO DE PORTIFÓLIO", "DGEP", "PRE"),
        ("COORDENAÇÃO DE SEGMENTO DE SOLO", "CSS", "DGEP"),
        ("COORDENAÇÃO DE SATÉLITES E APLICAÇÕES", "CSA", "DGEP"),
        ("COORDENAÇÃO DE VEÍCULOS LANÇADORES", "CVL", "DGEP"),
    ]

    for nome, sigla, pai in departamentos:
        cursor.execute(
            "INSERT OR IGNORE INTO departamento (nome_oficial, sigla, diretoria_pai) VALUES (?, ?, ?)",
            (nome, sigla, pai)
        )

    conn.commit()
    
    # Mostra resumo
    cursor.execute("SELECT COUNT(*) FROM departamento")
    total_dept = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM colaborador")
    total_colab = cursor.fetchone()[0]
    
    print(f"[OK] Banco de dados criado com sucesso em: {os.path.abspath(DB_PATH)}")
    print(f"     Departamentos: {total_dept}")
    print(f"     Colaboradores: {total_colab}")
    print(f"     Tabelas: departamento, colaborador, log_assinatura, log_alteracao")
    
    conn.close()
    return DB_PATH


if __name__ == "__main__":
    init_database()
