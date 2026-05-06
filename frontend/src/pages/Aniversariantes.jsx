import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { fetchAniversariantes } from "../services/api";
import * as XLSX from "xlsx";

function StarsBg() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.5 + 0.2,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: "absolute",
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.size,
          height: s.size,
          borderRadius: "50%",
          background: "white",
          opacity: s.opacity,
          animation: `twinkle ${s.duration}s ease-in-out infinite alternate`,
        }} />
      ))}
    </div>
  );
}

const MESES = [
  { val: "01", label: "Janeiro" },
  { val: "02", label: "Fevereiro" },
  { val: "03", label: "Março" },
  { val: "04", label: "Abril" },
  { val: "05", label: "Maio" },
  { val: "06", label: "Junho" },
  { val: "07", label: "Julho" },
  { val: "08", label: "Agosto" },
  { val: "09", label: "Setembro" },
  { val: "10", label: "Outubro" },
  { val: "11", label: "Novembro" },
  { val: "12", label: "Dezembro" },
];

export default function Aniversariantes() {
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [mesesSelecionados, setMesesSelecionados] = useState([]);
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const pageBg = isDark
    ? "radial-gradient(ellipse at top right, #0d1f3c 0%, #050d1a 60%, #020810 100%)"
    : "linear-gradient(135deg, #f0f4fc 0%, #e1e9f5 100%)";

  const panelBg = isDark ? "rgba(10,20,45,0.8)" : "rgba(255,255,255,0.9)";
  const borderColor = isDark ? "rgba(100,150,255,0.15)" : "rgba(0,80,200,0.1)";

  useEffect(() => {
    carregarDados();
  }, [mesesSelecionados]);

  async function carregarDados() {
    setCarregando(true);
    setErro("");
    try {
      const mesesStr = mesesSelecionados.join(",");
      const data = await fetchAniversariantes(mesesStr);
      // Ordenar por dia/mês (string simple order if format is DD/MM/YYYY)
      const dataSorted = data.sort((a, b) => {
        const partsA = a.data_aniversario.split("/");
        const partsB = b.data_aniversario.split("/");
        if (partsA.length < 2 || partsB.length < 2) return 0;
        const dA = partsA[1] + partsA[0]; // MMDD
        const dB = partsB[1] + partsB[0];
        return dA.localeCompare(dB);
      });
      setDados(dataSorted);
    } catch (err) {
      setErro("Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }

  function handleMesToggle(val) {
    if (mesesSelecionados.includes(val)) {
      setMesesSelecionados(mesesSelecionados.filter(m => m !== val));
    } else {
      setMesesSelecionados([...mesesSelecionados, val]);
    }
  }

  function handleExportar() {
    if (dados.length === 0) return;
    const dadosExcel = dados.map(item => ({
      "Nome": item.nome,
      "Data de Aniversário": item.data_aniversario,
      "Unidade": item.unidade
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Aniversariantes");
    XLSX.writeFile(workbook, "aniversariantes_aeb.xlsx");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: pageBg,
      transition: "background 0.4s ease",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif"
    }}>
      {isDark && <StarsBg />}

      {/* Header simples */}
      <header style={{
        position: "relative", zIndex: 10,
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${borderColor}`,
        background: isDark ? "rgba(5,13,26,0.6)" : "rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            background: isDark ? "linear-gradient(135deg, #1a3a7a, #0d2050)" : "linear-gradient(135deg, #1565c0, #0d47a1)",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 18,
          }}>
            🎂
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isDark ? "#e8eef7" : "#0d1f3c" }}>
              Aniversariantes do Mês
            </h1>
            <span style={{ fontSize: 11, color: isDark ? "rgba(180,200,235,0.6)" : "rgba(0,60,160,0.5)" }}>
              Gerador de Planilhas
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={toggleTheme}
            style={{
              background: "transparent", border: `1px solid ${borderColor}`,
              borderRadius: 6, color: isDark ? "#fff" : "#000",
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16
            }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            style={{
              background: "transparent", border: `1px solid ${borderColor}`,
              borderRadius: 6, color: isDark ? "#ef5350" : "#d32f2f",
              padding: "0 14px", cursor: "pointer", fontWeight: 600, fontSize: 13
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, padding: "32px 24px", maxWidth: 1000, margin: "0 auto" }}>
        
        {/* Painel de Filtros */}
        <div style={{
          background: panelBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.4)" : "0 16px 40px rgba(0,80,200,0.05)",
          backdropFilter: "blur(16px)"
        }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 16, color: isDark ? "#fff" : "#000" }}>Selecione os Meses</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {MESES.map(m => {
              const selected = mesesSelecionados.includes(m.val);
              return (
                <button
                  key={m.val}
                  onClick={() => handleMesToggle(m.val)}
                  style={{
                    background: selected ? (isDark ? "rgba(100,150,255,0.3)" : "rgba(21,101,192,0.15)") : "transparent",
                    border: `1px solid ${selected ? (isDark ? "#90caf9" : "#1565c0") : borderColor}`,
                    borderRadius: 20,
                    padding: "8px 16px",
                    color: selected ? (isDark ? "#90caf9" : "#1565c0") : (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"),
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: selected ? 600 : 400,
                    transition: "all 0.2s"
                  }}
                >
                  {m.label}
                </button>
              );
            })}
            {mesesSelecionados.length > 0 && (
              <button
                onClick={() => setMesesSelecionados([])}
                style={{
                  background: "transparent", border: "none", color: "#ef5350", cursor: "pointer", fontSize: 12, marginLeft: "auto", textDecoration: "underline"
                }}
              >
                Limpar seleção
              </button>
            )}
          </div>
        </div>

        {/* Lista de Preview */}
        <div style={{
          background: panelBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.4)" : "0 16px 40px rgba(0,80,200,0.05)",
          backdropFilter: "blur(16px)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: isDark ? "#fff" : "#000" }}>
              Pré-visualização {dados.length > 0 && <span style={{ opacity: 0.5, fontSize: 14 }}>({dados.length} resultados)</span>}
            </h2>
            <button
              onClick={handleExportar}
              disabled={dados.length === 0}
              style={{
                background: "linear-gradient(135deg, #2e7d32, #1b5e20)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: dados.length === 0 ? "not-allowed" : "pointer",
                opacity: dados.length === 0 ? 0.5 : 1,
                display: "flex", alignItems: "center", gap: 8,
                transition: "transform 0.15s, opacity 0.2s"
              }}
              onMouseEnter={e => { if (dados.length > 0) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { if (dados.length > 0) e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <span>📥</span> Exportar .xlsx
            </button>
          </div>

          {carregando ? (
            <div style={{ padding: 40, textAlign: "center", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
              Carregando dados...
            </div>
          ) : erro ? (
            <div style={{ padding: 40, textAlign: "center", color: "#ef5350" }}>{erro}</div>
          ) : dados.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
              {mesesSelecionados.length === 0 
                ? "Selecione um ou mais meses acima para visualizar os aniversariantes."
                : "Nenhum colaborador encontrado para o(s) mês(es) selecionado(s)."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${borderColor}`, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 12, textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 16px" }}>Nome</th>
                    <th style={{ padding: "12px 16px" }}>Data de Aniversário</th>
                    <th style={{ padding: "12px 16px" }}>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                      <td style={{ padding: "14px 16px", color: isDark ? "#fff" : "#000", fontWeight: 500, fontSize: 14 }}>{d.nome}</td>
                      <td style={{ padding: "14px 16px", color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: 14 }}>{d.data_aniversario}</td>
                      <td style={{ padding: "14px 16px", color: isDark ? "#90caf9" : "#1565c0", fontSize: 14, fontWeight: 600 }}>{d.unidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
      <style>{`@keyframes twinkle { from { opacity: 0.2; } to { opacity: 0.8; } }`}</style>
    </div>
  );
}
