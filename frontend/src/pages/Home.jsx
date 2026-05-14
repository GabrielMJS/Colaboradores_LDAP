import { useState, useEffect, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import Header from "../components/Header";
import Stars from "../components/Stars";
import ColaboradorRow from "../components/ColaboradorRow";
import { fetchColaboradores } from "../services/api";

export default function Home() {
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [search, setSearch] = useState("");
  const [unidade, setUnidade] = useState("Selecionar Unidade");
  const [currentPage, setCurrentPage] = useState(1);
  const theme = useTheme();

  useEffect(() => {
    setCurrentPage(1);
  }, [search, unidade]);

  useEffect(() => {
    setCarregando(true);
    setErro("");
    fetchColaboradores()
      .then(dados => setColaboradores(dados))
      .catch(() => setErro("Não foi possível carregar os colaboradores."))
      .finally(() => setCarregando(false));
  }, []);

  const availableUnidades = useMemo(() => {
    const lotacoes = colaboradores
      .map(c => (c.ou || c.department || "").trim())
      .filter(d => d !== "");
    // Remove duplicatas e ordena alfabeticamente
    const unique = [...new Set(lotacoes)].sort();
    return ["Selecionar Unidade", ...unique];
  }, [colaboradores]);

  const filtered = useMemo(() => {
    const removeAcentos = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let result = colaboradores.filter(c => {
      const nome = c.displayName || c.cn || "";
      
      const nomeNormalizado = removeAcentos(nome.toLowerCase());
      const searchNormalizado = removeAcentos(search.toLowerCase());
      
      const matchSearch = nomeNormalizado.includes(searchNormalizado);
      
      const siglaUnidade = (c.ou || c.department || "").trim();

      const matchUnidade =
        unidade === "Selecionar Unidade" ||
        siglaUnidade === unidade;
        
      return matchSearch && matchUnidade;
    });
    
    result.sort((a, b) => {
      const nameA = a.displayName || a.cn || "";
      const nameB = b.displayName || b.cn || "";
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [colaboradores, search, unidade]);

  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  function extrairRamalCurto(telephoneNumber) {
    // LDAP retorna "2033-4070" -> extraímos "4070"
    if (!telephoneNumber) return "";
    const str = String(telephoneNumber).trim();
    if (str.includes("-")) return str.split("-").pop();
    return str;
  }

  /**
   * Normaliza dados do colaborador para exibição.
   *
   * HIERARQUIA DE DADOS (prioridade):
   *   1º LDAP (sempre prevalece)
   *   2º Painel Admin (modificações feitas por admins sobrescrevem/complementam o LDAP)
   */
  function normalizarColaborador(c, index) {
    const nome = c.displayName || c.cn || "Sem nome";

    // Ramal: LDAP (curto)
    let ramal = extrairRamalCurto(c.telephoneNumber);

    // Email: LDAP
    const email = c.mail || "";

    // Lotação é o nome completo que vem no department (agora forçado para maiúsculas)
    const lotacao = (c.department || "").trim().toUpperCase();
    const unidade = (c.ou || c.department || "").trim();

    return {
      id:      c.sAMAccountName || c.dn || index,
      nome,
      unidade,
      lotacao,
      ramal,
      email,
      cargo:   c.title || "",
      foto:    c.foto || null,
    };
  }

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
          availableUnidades={availableUnidades}
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
              gridTemplateColumns: "80px 1fr 100px 1fr 90px 220px 180px",
              gap: 16,
              padding: "12px 24px",
              borderBottom: theme.rowBorder,
              background: theme.tableHeaderBg,
            }}>
              {["FOTO", "NOME", "UNIDADE", "LOTAÇÃO", "RAMAL", "E-MAIL", "CARGO"].map(h => (
                <div key={h} style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600, fontSize: 11,
                  letterSpacing: "0.12em",
                  color: theme.tableHeaderColor,
                  textAlign: ["FOTO", "RAMAL", "UNIDADE"].includes(h) ? "center" : "left",
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

            {!carregando && !erro && paginated.map((c, i) => (
              <ColaboradorRow key={c.sAMAccountName || i} colaborador={normalizarColaborador(c, startIndex + i)} />
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
