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
  const theme = useTheme();

  useEffect(() => {
    setCarregando(true);
    setErro("");
    fetchColaboradores()
      .then(dados => setColaboradores(dados))
      .catch(() => setErro("Não foi possível carregar os colaboradores."))
      .finally(() => setCarregando(false));
  }, []);

  const availableUnidades = useMemo(() => {
    // Puxa as unidades dinâmicas da lotação (department) ou OU
    const lotacoes = colaboradores
      .map(c => c.department || c.ou || "")
      .map(d => d.trim())
      .filter(d => d !== "");
    // Remove duplicatas e ordena alfabeticamente
    const unique = [...new Set(lotacoes)].sort();
    return ["Selecionar Unidade", ...unique];
  }, [colaboradores]);

  const filtered = useMemo(() => {
    const removeAcentos = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return colaboradores.filter(c => {
      const nome = c.displayName || c.cn || "";
      
      const nomeNormalizado = removeAcentos(nome.toLowerCase());
      const searchNormalizado = removeAcentos(search.toLowerCase());
      
      const matchSearch = nomeNormalizado.includes(searchNormalizado);
      
      const matchUnidade =
        unidade === "Selecionar Unidade" ||
        (c.department || "").includes(unidade) ||
        (c.ou || "").includes(unidade);
        
      return matchSearch && matchUnidade;
    });
  }, [colaboradores, search, unidade]);

  function normalizarColaborador(c, index) {
    return {
      id:      c.sAMAccountName || c.dn || index,
      nome:    c.displayName || c.cn || "Sem nome",
      unidade: c.ou || "",
      lotacao: c.department || "",
      ramal:   c.telephoneNumber || "",
      email:   c.mail || "",
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
                  fontFamily: "'Barlow Condensed', sans-serif",
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
                color: theme.textMuted, fontFamily: "'Barlow', sans-serif",
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
                color: "#ef5350", fontFamily: "'Barlow', sans-serif", fontSize: 14,
              }}>
                ⚠ {erro}
              </div>
            )}

            {!carregando && !erro && filtered.length === 0 && (
              <div style={{
                padding: "48px", textAlign: "center",
                color: theme.textMuted, fontFamily: "'Barlow', sans-serif", fontSize: 14,
              }}>
                Nenhum colaborador encontrado.
              </div>
            )}

            {!carregando && !erro && filtered.map((c, i) => (
              <ColaboradorRow key={c.sAMAccountName || i} colaborador={normalizarColaborador(c, i)} />
            ))}
          </div>

          {!carregando && !erro && (
            <div style={{
              marginTop: 12, textAlign: "right", fontSize: 12,
              color: theme.textMuted, fontFamily: "'Barlow', sans-serif",
            }}>
              {filtered.length} de {colaboradores.length} colaborador{colaboradores.length !== 1 ? "es" : ""}
            </div>
          )}
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
