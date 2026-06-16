import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import Header from "../components/Header";
import Stars from "../components/Stars";
import ColaboradorRow from "../components/ColaboradorRow";
import { fetchColaboradores, fetchDepartamentos } from "../services/api";

function extrairRamalCurto(telephoneNumber) {
  if (!telephoneNumber) return "";
  const str = String(telephoneNumber).trim();
  if (str.includes("-")) return str.split("-").pop();
  return str;
}

function normalizarColaborador(c, index) {
  const nome = c.displayName || c.cn || "Sem nome";
  let ramal = extrairRamalCurto(c.telephoneNumber);
  const email = c.mail || "";
  const lotacao = (c.department || "").trim();
  const coordenacao = (c.coordenacao_sigla || "").trim();
  const diretoria = (c.diretoria_sigla || "").trim();
  const divisao = (c.divisao_sigla || "").trim();
  const diretoria_nome = c.diretoria_nome || "";
  const coordenacao_nome = c.coordenacao_nome || "";
  const divisao_nome = c.divisao_nome || "";

  return {
    id:      c.sAMAccountName || c.dn || index,
    nome,
    diretoria,
    coordenacao,
    divisao,
    diretoria_nome,
    coordenacao_nome,
    divisao_nome,
    lotacao,
    ramal,
    email,
    cargo:   c.title || "",
    foto:    c.foto || null,
  };
}

export default function Home() {
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [search, setSearch] = useState("");
  const [unidade, setUnidade] = useState("");
  const [departamentos, setDepartamentos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const theme = useTheme();

  useEffect(() => {
    setCurrentPage(1);
  }, [search, unidade]);

  const carregarDados = () => {
    setCarregando(true);
    setErro("");
    Promise.all([
      fetchColaboradores(),
      fetchDepartamentos()
    ])
      .then(([dadosColab, dadosDept]) => {
        setColaboradores(dadosColab);
        setDepartamentos(dadosDept);
      })
      .catch(() => setErro("Não foi possível carregar os colaboradores."))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const filtered = useMemo(() => {
    const removeAcentos = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let result = colaboradores.filter(c => {
      const nome = c.displayName || c.cn || "";
      
      const nomeNormalizado = removeAcentos(nome.toLowerCase());
      const searchNormalizado = removeAcentos(search.toLowerCase());
      
      const matchSearch = nomeNormalizado.includes(searchNormalizado);
      
      const ou = (c.ou || c.department || "").trim();
      const matchUnidade =
        !unidade ||
        ou === unidade ||
        (c.diretoria_sigla || "").trim() === unidade ||
        (c.coordenacao_sigla || "").trim() === unidade ||
        (c.divisao_sigla || "").trim() === unidade;
        
      return matchSearch && matchUnidade;
    });
    
    result.sort((a, b) => {
      if (unidade) {
        const ouA = (a.ou || a.department || "").trim();
        const ouB = (b.ou || b.department || "").trim();
        const isPrimaryA = ouA === unidade;
        const isPrimaryB = ouB === unidade;
        
        if (isPrimaryA && !isPrimaryB) return -1;
        if (!isPrimaryA && isPrimaryB) return 1;
      }
      
      const nameA = a.displayName || a.cn || "";
      const nameB = b.displayName || b.cn || "";
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [colaboradores, search, unidade]);

  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = useMemo(() => {
    return filtered.slice(startIndex, startIndex + itemsPerPage).map((c, i) => normalizarColaborador(c, startIndex + i));
  }, [filtered, startIndex]);



  return (
    <div style={{
      minHeight: "100vh",
      background: theme.pageBg,
      transition: "background 0.4s ease",
      position: "relative",
      overflow: "hidden",
    }}>
      <Stars />

      {theme.isDark && (
        <div style={{
          position: "fixed",
          top: "30%", right: "-10%",
          width: 500, height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30,80,160,0.12) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        <Header
          search={search}
          onSearch={setSearch}
          unidade={unidade}
          onUnidade={setUnidade}
          departamentos={departamentos}
          onLogoClick={() => {
            setSearch("");
            setUnidade("");
            carregarDados();
          }}
        />

        <main style={{ padding: "24px" }}>
          <div style={{
            background: theme.tableBg,
            border: theme.tableBorder,
            borderRadius: 12,
            backdropFilter: "blur(8px)",
            overflow: "hidden",
            transition: "background 0.4s ease, border 0.4s ease",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "80px 1.5fr 110px 120px 120px 90px 220px 180px",
              gap: 16,
              padding: "12px 24px",
              borderBottom: theme.rowBorder,
              background: theme.tableHeaderBg,
            }}>
              {["FOTO", "NOME", "DIRETORIA", "COORDENAÇÃO", "DIVISÃO", "RAMAL", "E-MAIL", "CARGO"].map(h => (
                <div key={h} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600, fontSize: 11,
                  letterSpacing: "0.12em",
                  color: theme.tableHeaderColor,
                  textAlign: ["FOTO", "RAMAL", "DIRETORIA", "COORDENAÇÃO", "DIVISÃO"].includes(h) ? "center" : "left",
                }}>
                  {h}
                </div>
              ))}
            </div>

            {carregando && (
              <div style={{
                padding: "48px", textAlign: "center",
                color: theme.textMuted, fontFamily: "'Inter', sans-serif",
                fontSize: 14, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 10,
              }}>
                <span style={{
                  width: 16, height: 16,
                  border: `2px solid ${theme.isDark ? "rgba(255,255,255,0.15)" : "rgba(0,60,160,0.15)"}`,
                  borderTopColor: theme.textAccent,
                  borderRadius: "50%", display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }} />
                Carregando colaboradores...
              </div>
            )}

            {!carregando && erro && (
              <div style={{
                padding: "48px", textAlign: "center",
                color: "#ef5350", fontFamily: "'Inter', sans-serif", fontSize: 14,
              }}>
                ⚠ {erro}
              </div>
            )}

            {!carregando && !erro && filtered.length === 0 && (
              <div style={{
                padding: "48px", textAlign: "center",
                color: theme.textMuted, fontFamily: "'Inter', sans-serif", fontSize: 14,
              }}>
                Nenhum colaborador encontrado.
              </div>
            )}

            {!carregando && !erro && paginated.map((c) => (
              <ColaboradorRow key={c.id} colaborador={c} />
            ))}
          </div>

          {!carregando && !erro && filtered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 20 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 6, color: theme.textPrimary, padding: "6px 12px",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.5 : 1, fontFamily: "'Inter', sans-serif", fontSize: 13
                  }}>
                  Anterior
                </button>
                <div style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: 13, color: theme.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                  Página {currentPage} de {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    background: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 6, color: theme.textPrimary, padding: "6px 12px",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage === totalPages ? 0.5 : 1, fontFamily: "'Inter', sans-serif", fontSize: 13
                  }}>
                  Próxima
                </button>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: "'Inter', sans-serif" }}>
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filtered.length)} de {filtered.length} colaboradores
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
