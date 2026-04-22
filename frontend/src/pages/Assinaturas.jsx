import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { MOCK_COLABORADORES } from "../data/mockData";

// Capas disponíveis na pasta public/capas-assinaturas
// Adicione os nomes dos arquivos aqui conforme for colocando na pasta
const CAPAS = [
  { id: 1, nome: "Padrão Espacial", arquivo: "/capas-assinaturas/capa1.png" },
  { id: 2, nome: "Satélite", arquivo: "/capas-assinaturas/capa2.png" },
  { id: 3, nome: "Lançador", arquivo: "/capas-assinaturas/capa3.png" },
];

const ASSINATURA_W = 700;
const ASSINATURA_H = 180;

export default function Assinaturas() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const canvasRef = useRef(null);

  const [colaboradorId, setColaboradorId] = useState("");
  const [capaId, setCapaId] = useState("");
  const [ramal, setRamal] = useState("");
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState(null);

  const colaborador = MOCK_COLABORADORES.find(c => c.id === Number(colaboradorId));

  // Preenche ramal e email automaticamente ao selecionar colaborador
  useEffect(() => {
    if (colaborador) {
      setRamal(colaborador.ramal || "");
      setEmail(colaborador.email || "");
    } else {
      setRamal("");
      setEmail("");
    }
  }, [colaboradorId]);

  const capa = CAPAS.find(c => c.id === Number(capaId));

  function gerarAssinatura() {
    if (!colaborador || !capa) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = ASSINATURA_W;
    canvas.height = ASSINATURA_H;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = capa.arquivo;

    img.onload = () => {
      // Desenha a capa como fundo
      ctx.drawImage(img, 0, 0, ASSINATURA_W, ASSINATURA_H);

      // Área de texto (lado direito, similar ao modelo)
      const textX = 220;
      const startY = 45;
      const lineH = 22;

      // Nome
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(colaborador.nome, textX, startY);

      // Área (cargo/função)
      ctx.font = "13px Arial";
      ctx.fillStyle = "#CCDDEE";
      ctx.fillText(colaborador.cargo, textX, startY + lineH);

      // Lotação (Coordenação)
      ctx.font = "13px Arial";
      ctx.fillStyle = "#CCDDEE";
      ctx.fillText(colaborador.lotacao, textX, startY + lineH * 2);

      // Diretoria (unidade)
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Agência Espacial Brasileira", textX, startY + lineH * 3);

      // Ramal e email
      ctx.font = "13px Arial";
      ctx.fillStyle = "#CCDDEE";
      ctx.fillText(`(61) ${ramal}    ${email}`, textX, startY + lineH * 4);

      // Gera preview
      setPreview(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      // Capa não encontrada: gera com fundo padrão
      ctx.fillStyle = "#0d1f3c";
      ctx.fillRect(0, 0, ASSINATURA_W, ASSINATURA_H);

      // Borda arredondada visual
      ctx.strokeStyle = "rgba(100,150,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, ASSINATURA_W - 2, ASSINATURA_H - 2);

      // Logo placeholder
      ctx.fillStyle = "#1565c0";
      ctx.fillRect(20, 30, 140, 110);
      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("AEB", 60, 95);

      // Linha divisória
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(175, 20);
      ctx.lineTo(175, 160);
      ctx.stroke();

      // Textos
      const textX = 195;
      const startY = 45;
      const lineH = 22;

      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(colaborador.nome, textX, startY);

      ctx.font = "13px Arial";
      ctx.fillStyle = "#90caf9";
      ctx.fillText(colaborador.cargo, textX, startY + lineH);

      ctx.font = "13px Arial";
      ctx.fillStyle = "#CCDDEE";

      // Quebra texto longo da lotação
      const lotacao = colaborador.lotacao;
      if (lotacao.length > 45) {
        const mid = lotacao.lastIndexOf(" ", 45);
        ctx.fillText(lotacao.substring(0, mid), textX, startY + lineH * 2);
        ctx.fillText(lotacao.substring(mid + 1), textX, startY + lineH * 3 - 4);
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Agência Espacial Brasileira", textX, startY + lineH * 4 - 4);
        ctx.font = "13px Arial";
        ctx.fillStyle = "#CCDDEE";
        ctx.fillText(`(61) ${ramal}     ${email}`, textX, startY + lineH * 5 - 4);
      } else {
        ctx.fillText(lotacao, textX, startY + lineH * 2);
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Agência Espacial Brasileira", textX, startY + lineH * 3);
        ctx.font = "13px Arial";
        ctx.fillStyle = "#CCDDEE";
        ctx.fillText(`(61) ${ramal}     ${email}`, textX, startY + lineH * 4);
      }

      setPreview(canvas.toDataURL("image/png"));
    };
  }

  function baixarAssinatura() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = `assinatura-${colaborador?.nome.split(" ")[0].toLowerCase() || "aeb"}.png`;
    a.click();
  }

  const inputStyle = {
    background: theme.inputBg,
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: 6,
    color: theme.inputColor,
    padding: "9px 14px",
    fontSize: 13,
    width: "100%",
    outline: "none",
    fontFamily: "'Barlow', sans-serif",
  };

  const labelStyle = {
    fontSize: 11,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 600,
    letterSpacing: "0.1em",
    color: theme.tableHeaderColor,
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.pageBg,
      transition: "background 0.4s ease",
      fontFamily: "'Barlow', sans-serif",
    }}>

      {/* Header simples */}
      <header style={{
        background: theme.headerBg,
        borderBottom: theme.headerBorder,
        padding: "0 32px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "transparent",
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 6,
              color: theme.textSecondary,
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Barlow', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.rowHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            ← Voltar
          </button>

          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: theme.textPrimary,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            🛰 AEB
            <span style={{
              marginLeft: 12,
              paddingLeft: 12,
              borderLeft: `1px solid ${theme.rowBorder}`,
              fontWeight: 600,
              fontSize: 16,
              color: theme.textAccent,
            }}>
              Gerador de Assinaturas
            </span>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={theme.toggleTheme}
          style={{
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 8,
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 18,
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {theme.isDark ? "☀️" : "🌙"}
        </button>
      </header>

      <main style={{ padding: "32px", maxWidth: 900, margin: "0 auto" }}>

        {/* Formulário */}
        <div style={{
          background: theme.tableBg,
          border: theme.tableBorder,
          borderRadius: 12,
          padding: "28px",
          backdropFilter: "blur(8px)",
          marginBottom: 28,
        }}>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: theme.textAccent,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}>
            1. Dados da assinatura
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

            {/* Colaborador */}
            <div>
              <label style={labelStyle}>Colaborador</label>
              <select
                value={colaboradorId}
                onChange={e => setColaboradorId(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Selecionar colaborador...</option>
                {MOCK_COLABORADORES.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Capa */}
            <div>
              <label style={labelStyle}>Capa da assinatura</label>
              <select
                value={capaId}
                onChange={e => setCapaId(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="">Selecionar capa...</option>
                {CAPAS.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Campos preenchidos automaticamente */}
          {colaborador && (
            <div style={{
              background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,60,160,0.03)",
              border: theme.rowBorder,
              borderRadius: 8,
              padding: "16px",
              marginBottom: 20,
            }}>
              <p style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                Dados puxados automaticamente
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                  { label: "Nome", value: colaborador.nome },
                  { label: "Área / Cargo", value: colaborador.cargo },
                  { label: "Diretoria / Lotação", value: colaborador.lotacao },
                ].map(f => (
                  <div key={f.label}>
                    <span style={{ ...labelStyle, marginBottom: 4 }}>{f.label}</span>
                    <div style={{
                      fontSize: 13,
                      color: theme.textPrimary,
                      fontFamily: "'Barlow', sans-serif",
                      padding: "7px 0",
                      borderBottom: theme.rowBorder,
                    }}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ramal editável | E-mail bloqueado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Ramal</label>
              <input
                type="text"
                value={ramal}
                onChange={e => setRamal(e.target.value)}
                placeholder="Ex: 2033-4890"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                E-mail
                <span style={{ marginLeft: 6, fontSize: 10, color: theme.isDark ? "rgba(255,200,100,0.6)" : "rgba(180,100,0,0.7)", fontStyle: "normal" }}>
                  🔒 não editável
                </span>
              </label>
              <input
                type="text"
                value={email}
                readOnly
                style={{
                  ...inputStyle,
                  opacity: 0.55,
                  cursor: "not-allowed",
                  background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
                }}
              />
            </div>
          </div>

          <button
            onClick={gerarAssinatura}
            disabled={!colaborador || !capa}
            style={{
              background: colaborador && capa
                ? "linear-gradient(135deg, #1565c0, #0d47a1)"
                : theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              border: "none",
              borderRadius: 8,
              color: colaborador && capa ? "#fff" : theme.textMuted,
              padding: "10px 28px",
              fontSize: 14,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: colaborador && capa ? "pointer" : "not-allowed",
              transition: "opacity 0.2s, transform 0.15s",
            }}
            onMouseEnter={e => { if (colaborador && capa) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            ✦ Gerar Preview
          </button>
        </div>

        {/* Preview */}
        {preview && (
          <div style={{
            background: theme.tableBg,
            border: theme.tableBorder,
            borderRadius: 12,
            padding: "28px",
            backdropFilter: "blur(8px)",
            animation: "fadeIn 0.3s ease",
          }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: theme.textAccent,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              2. Preview da assinatura
            </h2>

            <div style={{
              background: theme.isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)",
              borderRadius: 8,
              padding: "20px",
              display: "flex",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <img
                src={preview}
                alt="Preview da assinatura"
                style={{ maxWidth: "100%", borderRadius: 6 }}
              />
            </div>

            <button
              onClick={baixarAssinatura}
              style={{
                background: "linear-gradient(135deg, #2e7d32, #1b5e20)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                padding: "10px 28px",
                fontSize: 14,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              ↓ Baixar PNG
            </button>
          </div>
        )}

        {/* Canvas oculto para geração */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </main>
    </div>
  );
}
