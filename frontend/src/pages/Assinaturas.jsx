import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { MOCK_COLABORADORES } from "../data/mockData";

// Capas disponíveis na pasta public/assinaturas
// Adicione os nomes dos arquivos aqui conforme for colocando na pasta
const CAPAS = [
  { id: 1, nome: "Padrão Espacial", arquivo: "/assinaturas/capa1.png" },
  { id: 2, nome: "Satélite", arquivo: "/assinaturas/capa2.png" },
  { id: 3, nome: "Lançador", arquivo: "/assinaturas/capa3.png" },
];

// Removidas as larguras hardcoded para podermos usar o tamanho real da imagem

export default function Assinaturas() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const canvasRef = useRef(null);

  const [capaId, setCapaId] = useState("");
  const [ramal, setRamal] = useState("");
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState(null);
  const [capaDropdownOpen, setCapaDropdownOpen] = useState(false);

  // Deriva o colaborador logado
  const colaborador = user ? {
    nome: user.displayName || user.username || "Usuário não identificado",
    cargo: user.title || "Cargo não informado",
    lotacao: user.department || "Lotação não informada",
    email: user.email || "",
  } : null;

  // Ao montar, preenche o e-mail (e ramal, se existir)
  useEffect(() => {
    if (colaborador) {
      setEmail(colaborador.email);
      // Se houver ramal salvo no LDAP futuro, pode preencher: setRamal(user.ramal || "");
    }
  }, [user]);

  const capa = CAPAS.find(c => c.id === Number(capaId));

  function gerarAssinatura() {
    if (!colaborador || !capa) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = capa.arquivo;

    img.onload = () => {
      // Define o tamanho do canvas para o tamanho REAL da imagem (ex: 3663x818)
      canvas.width = img.width;
      canvas.height = img.height;

      // Desenha a capa como fundo
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Usando proporções para ficar perfeito em qualquer resolução
      const textX = canvas.width * 0.305; // Ajuste horizontal (após a logo)
      let currentY = canvas.height * 0.30; // Ajuste vertical inicial
      const lineSpacing = canvas.height * 0.11; // Espaço entre linhas

      // Tamanhos de fonte proporcionais
      const fontNome = Math.round(canvas.height * 0.085);
      const fontMedia = Math.round(canvas.height * 0.055);
      const fontAeb = Math.round(canvas.height * 0.075);

      // Nome
      ctx.font = `bold ${fontNome}px 'Times New Roman', Times, serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(colaborador.nome, textX, currentY);
      currentY += lineSpacing;

      // Cargo (Suporte CTI)
      ctx.font = `${fontMedia}px 'Times New Roman', Times, serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(colaborador.cargo, textX, currentY);
      currentY += lineSpacing - (canvas.height * 0.01);

      // Lotação (Coordenação de Tecnologia da Informação)
      ctx.font = `${fontMedia}px 'Times New Roman', Times, serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(colaborador.lotacao, textX, currentY);
      currentY += lineSpacing + (canvas.height * 0.02); // Espaço extra

      // Agência Espacial Brasileira
      ctx.font = `bold ${fontAeb}px 'Times New Roman', Times, serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Agência Espacial Brasileira", textX, currentY);
      currentY += lineSpacing;

      // Tratamento do ramal: garantindo que começará com (61) 2033 -
      const apenasDigitos = ramal.replace(/\D/g, '');
      const digitosFinais = apenasDigitos.slice(-4);
      const ramalFormatado = `(61) 2033-${digitosFinais || "XXXX"}`;

      // Ramal e email
      ctx.font = `${fontMedia}px 'Times New Roman', Times, serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(`${ramalFormatado}    ${email}`, textX, currentY);

      // Gera preview
      setPreview(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      // Capa não encontrada: gera com fundo padrão
      canvas.width = 700;
      canvas.height = 180;
      ctx.fillStyle = "#0d1f3c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Borda arredondada visual
      ctx.strokeStyle = "rgba(100,150,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

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

            {/* Colaborador Fixo */}
            <div>
              <label style={labelStyle}>
                Colaborador
                <span style={{ marginLeft: 6, fontSize: 10, color: theme.isDark ? "rgba(255,200,100,0.6)" : "rgba(180,100,0,0.7)", fontStyle: "normal" }}>
                  🔒 logado
                </span>
              </label>
              <input
                type="text"
                value={colaborador ? colaborador.nome : "Carregando..."}
                readOnly
                style={{
                  ...inputStyle,
                  opacity: 0.7,
                  cursor: "not-allowed",
                  background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
                }}
              />
            </div>

            {/* Capa */}
            <div>
              <label style={labelStyle}>Capa da assinatura</label>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setCapaDropdownOpen(o => !o);
                  }}
                  style={{
                    background: theme.inputBg,
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: 6,
                    color: !capaId ? theme.inputPlaceholder : theme.inputColor,
                    padding: "9px 32px 9px 14px",
                    fontSize: 13,
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "'Barlow', sans-serif",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    position: "relative",
                  }}
                >
                  {capa ? capa.nome : "Selecionar capa..."}
                  <span style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: `translateY(-50%) rotate(${capaDropdownOpen ? 180 : 0}deg)`,
                    transition: "transform 0.2s",
                    color: theme.inputPlaceholder,
                    fontSize: 10,
                  }}>▼</span>
                </button>

                {capaDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    width: "100%",
                    background: theme.dropdownBg,
                    border: `1px solid ${theme.dropdownBorder}`,
                    borderRadius: 8,
                    backdropFilter: "blur(16px)",
                    maxHeight: 250,
                    overflowY: "auto",
                    zIndex: 200,
                    animation: "slideDown 0.15s ease",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
                  }}>
                    <div
                      onClick={() => { setCapaId(""); setCapaDropdownOpen(false); }}
                      style={{
                        padding: "9px 16px",
                        fontSize: 13,
                        color: !capaId ? theme.textAccent : theme.textSecondary,
                        cursor: "pointer",
                        fontFamily: "'Barlow', sans-serif",
                        background: !capaId ? theme.dropdownSelected : "transparent",
                        transition: "background 0.15s",
                        fontStyle: "italic",
                      }}
                      onMouseEnter={e => { if (capaId) e.currentTarget.style.background = theme.dropdownHover; }}
                      onMouseLeave={e => { if (capaId) e.currentTarget.style.background = "transparent"; }}
                    >
                      Selecionar capa...
                    </div>
                    {CAPAS.map(c => (
                      <div
                        key={c.id}
                        onClick={() => { setCapaId(c.id); setCapaDropdownOpen(false); }}
                        style={{
                          padding: "9px 16px",
                          fontSize: 13,
                          color: c.id === Number(capaId) ? theme.textAccent : theme.textSecondary,
                          cursor: "pointer",
                          fontFamily: "'Barlow', sans-serif",
                          background: c.id === Number(capaId) ? theme.dropdownSelected : "transparent",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => { if (c.id !== Number(capaId)) e.currentTarget.style.background = theme.dropdownHover; }}
                        onMouseLeave={e => { if (c.id !== Number(capaId)) e.currentTarget.style.background = "transparent"; }}
                      >
                        {c.nome}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
