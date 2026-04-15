import { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import Header from "../components/Header";
import Stars from "../components/Stars";
import ColaboradorRow from "../components/ColaboradorRow";
import { MOCK_COLABORADORES } from "../data/mockData";

export default function Home() {
  const [search, setSearch] = useState("");
  const [unidade, setUnidade] = useState("Selecionar Unidade");
  const theme = useTheme();

  const filtered = useMemo(() => {
    return MOCK_COLABORADORES.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase());
      const matchUnidade =
        unidade === "Selecionar Unidade" ||
        c.lotacao === unidade ||
        c.unidade === unidade;
      return matchSearch && matchUnidade;
    });
  }, [search, unidade]);

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.pageBg,
      transition: "background 0.4s ease",
      position: "relative",
      overflow: "hidden",
    }}>
      <Stars />

      {/* Nebula glow — só no dark */}
      {theme.isDark && (
        <div style={{
          position: "fixed",
          top: "30%",
          right: "-10%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30,80,160,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        <Header
          search={search}
          onSearch={setSearch}
          unidade={unidade}
          onUnidade={setUnidade}
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
            {/* Table header */}
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
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  color: theme.tableHeaderColor,
                  textAlign: ["FOTO", "RAMAL", "UNIDADE"].includes(h) ? "center" : "left",
                }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {filtered.length > 0 ? (
              filtered.map(c => <ColaboradorRow key={c.id} colaborador={c} />)
            ) : (
              <div style={{
                padding: "48px",
                textAlign: "center",
                color: theme.textMuted,
                fontFamily: "'Barlow', sans-serif",
                fontSize: 14,
              }}>
                Nenhum colaborador encontrado.
              </div>
            )}
          </div>

          {/* Footer count */}
          <div style={{
            marginTop: 12,
            textAlign: "right",
            fontSize: 12,
            color: theme.textMuted,
            fontFamily: "'Barlow', sans-serif",
          }}>
            {filtered.length} colaborador{filtered.length !== 1 ? "es" : ""} exibido{filtered.length !== 1 ? "s" : ""}
          </div>
        </main>
      </div>
    </div>
  );
}
