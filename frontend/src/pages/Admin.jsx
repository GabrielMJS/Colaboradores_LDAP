import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { fetchColaboradoresAdmin, saveOverride, deleteOverride } from "../services/api";


// -------------------------------------------------------------------
// Capas — em produção virá do backend
// Substituído temporariamente o import.meta.glob para evitar warnings do Vite sobre a pasta /public
const CAPAS_REAIS = [
  { id: 1, nome: "Assinatura 30 Anos.png", arquivo: "/assinatura/Assinatura 30 Anos.png", ativa: true },
  { id: 2, nome: "Assinatura Independência.png", arquivo: "/assinatura/Assinatura Independência.png", ativa: true },
  { id: 3, nome: "Assinatura Padrão.png", arquivo: "/assinatura/Assinatura Padrão.png", ativa: true }
];

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
function Badge({ ativo, label }) {
  const theme = useTheme();
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontFamily: "'Inter', sans-serif",
      fontWeight: 600, letterSpacing: "0.06em",
      background: ativo ? "rgba(46,125,50,0.2)" : "rgba(198,40,40,0.2)",
      color: ativo ? "#81c784" : "#ef9a9a",
      border: `1px solid ${ativo ? "rgba(46,125,50,0.4)" : "rgba(198,40,40,0.4)"}`,
    }}>
      {label || (ativo ? "VISÍVEL" : "OCULTO")}
    </span>
  );
}

function SectionTitle({ children }) {
  const theme = useTheme();
  return (
    <h2 style={{
      fontFamily: "'Inter', sans-serif", fontWeight: 700,
      fontSize: 16, color: theme.textAccent, letterSpacing: "0.1em",
      textTransform: "uppercase", marginBottom: 20,
    }}>{children}</h2>
  );
}

function labelStyle(theme) {
  return {
    display: "block", fontSize: 11, marginBottom: 5,
    fontFamily: "'Inter', sans-serif", fontWeight: 600,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: theme.tableHeaderColor,
  };
}

function inputStyle(theme) {
  return {
    background: theme.inputBg, border: `1px solid ${theme.inputBorder}`,
    borderRadius: 6, color: theme.inputColor, padding: "8px 12px",
    fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif", width: "100%",
  };
}

// -------------------------------------------------------------------
// Aba: Usuários
// -------------------------------------------------------------------
function AbaUsuarios() {
  const theme = useTheme();
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null); // username em edição
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState({ id: null, msg: "" });

  useEffect(() => {
    fetchColaboradoresAdmin()
      .then(setColaboradores)
      .catch(() => setColaboradores([]))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return colaboradores.filter(c =>
      (c.displayName || "").toLowerCase().includes(q) ||
      (c.sAMAccountName || "").toLowerCase().includes(q) ||
      (c.department || "").toLowerCase().includes(q)
    );
  }, [colaboradores, busca]);

  function abrirEdicao(c) {
    setEditando(c.sAMAccountName);
    setForm({
      ramal:   c.telephoneNumber || "",
      cargo:   c.title || "",
      unidade: c.ou || "",
      visivel: c.visivel !== false,
      data_aniversario: c.data_aniversario || "",
    });
  }

  function fecharEdicao() {
    setEditando(null);
    setForm({});
  }

  async function salvar(username) {
    setSalvando(true);
    try {
      await saveOverride(username, form);
      setColaboradores(prev => prev.map(c => {
        if (c.sAMAccountName !== username) return c;
        return {
          ...c,
          telephoneNumber: form.ramal,
          title: form.cargo,
          ou: form.unidade,
          visivel: form.visivel,
          data_aniversario: form.data_aniversario,
          _overrides: { ...c._overrides, ...form },
        };
      }));
      setFeedback({ id: username, msg: "✓ Salvo!" });
      setTimeout(() => setFeedback({ id: null, msg: "" }), 2500);
      fecharEdicao();
    } catch {
      setFeedback({ id: username, msg: "⚠ Erro ao salvar." });
    } finally {
      setSalvando(false);
    }
  }

  async function resetarOverride(username) {
    try {
      await deleteOverride(username);
      setColaboradores(prev => prev.map(c =>
        c.sAMAccountName === username
          ? { ...c, _overrides: {}, visivel: true }
          : c
      ));
    } catch {}
  }

  async function toggleVisivel(c) {
    const novoValor = c.visivel === false ? true : false;
    await saveOverride(c.sAMAccountName, { visivel: novoValor });
    setColaboradores(prev => prev.map(u =>
      u.sAMAccountName === c.sAMAccountName ? { ...u, visivel: novoValor } : u
    ));
  }

  if (carregando) return (
    <div style={{ padding: 48, textAlign: "center", color: theme.textMuted, fontFamily: "'Inter', sans-serif" }}>
      Carregando colaboradores...
    </div>
  );

  return (
    <div>
      <SectionTitle>👥 Gerenciar Colaboradores</SectionTitle>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <input
            type="text" placeholder="Buscar por nome, login ou lotação..."
            value={busca} onChange={e => setBusca(e.target.value)}
            style={{ ...inputStyle(theme), width: 320, paddingRight: 36 }}
          />
          <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>🔍</span>
        </div>
        <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: "'Inter', sans-serif" }}>
          {filtrados.length} de {colaboradores.length} colaboradores
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtrados.map(c => {
          const username = c.sAMAccountName;
          const temOverride = c._overrides && Object.keys(c._overrides).length > 0;
          const isEditando = editando === username;

          return (
            <div key={username} style={{
              background: theme.tableBg, border: theme.tableBorder,
              borderRadius: 10, overflow: "hidden",
              transition: "border-color 0.2s",
              borderColor: isEditando ? (theme.isDark ? "rgba(100,150,255,0.35)" : "rgba(0,80,200,0.35)") : undefined,
            }}>
              {/* Linha principal */}
              <div style={{
                display: "grid", gridTemplateColumns: "52px 1fr 130px 130px 120px 180px",
                alignItems: "center", gap: 16, padding: "12px 18px",
              }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: theme.isDark ? "linear-gradient(135deg,#1a2a4a,#0d1b35)" : "linear-gradient(135deg,#dce8f8,#c5d8f0)",
                  border: `2px solid ${theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,80,200,0.15)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>
                  {c.foto ? <img src={c.foto} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : "👤"}
                </div>

                {/* Nome + login */}
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, color: theme.textPrimary }}>
                    {c.displayName || c.cn || username}
                    {temOverride && <span style={{ marginLeft: 8, fontSize: 10, color: theme.isDark ? "#ffb74d" : "#e65100", fontFamily: "'Inter', sans-serif" }}>✎ EDITADO</span>}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>
                    {username} · {c.department || c.lotacao || "—"}
                  </div>
                </div>

                {/* Unidade */}
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: theme.textAccent }}>
                  {c.ou || c.unidade || "—"}
                </div>

                {/* Cargo */}
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: theme.textSecondary }}>
                  {c.title || c.cargo || "—"}
                </div>

                {/* Visibilidade */}
                <div>
                  <Badge ativo={c.visivel !== false} />
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {feedback.id === username && (
                    <span style={{ fontSize: 12, color: "#81c784", fontFamily: "'Inter', sans-serif", alignSelf: "center" }}>
                      {feedback.msg}
                    </span>
                  )}
                  <button
                    onClick={() => toggleVisivel(c)}
                    title={c.visivel !== false ? "Ocultar da página inicial" : "Mostrar na página inicial"}
                    style={{
                      background: "transparent", border: `1px solid ${theme.inputBorder}`,
                      borderRadius: 6, color: theme.textSecondary,
                      padding: "5px 10px", fontSize: 12,
                      fontFamily: "'Inter', sans-serif", cursor: "pointer",
                    }}
                  >
                    {c.visivel !== false ? "👁 Ocultar" : "👁 Mostrar"}
                  </button>
                  <button
                    onClick={() => isEditando ? fecharEdicao() : abrirEdicao(c)}
                    style={{
                      background: isEditando ? "transparent" : (theme.isDark ? "rgba(21,101,192,0.2)" : "rgba(21,101,192,0.1)"),
                      border: `1px solid ${theme.isDark ? "rgba(100,150,255,0.3)" : "rgba(21,101,192,0.25)"}`,
                      borderRadius: 6, color: theme.textAccent,
                      padding: "5px 12px", fontSize: 12,
                      fontFamily: "'Inter', sans-serif", fontWeight: 600,
                      letterSpacing: "0.06em", cursor: "pointer",
                    }}
                  >
                    {isEditando ? "Cancelar" : "✎ Editar"}
                  </button>
                  {temOverride && !isEditando && (
                    <button
                      onClick={() => resetarOverride(username)}
                      title="Remover todas as customizações e voltar ao padrão do LDAP"
                      style={{
                        background: "transparent", border: "1px solid rgba(198,40,40,0.3)",
                        borderRadius: 6, color: "#ef9a9a",
                        padding: "5px 10px", fontSize: 12,
                        fontFamily: "'Inter', sans-serif", cursor: "pointer",
                      }}
                    >
                      ↺ Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Painel de edição expandido */}
              {isEditando && (
                <div style={{
                  borderTop: theme.rowBorder,
                  padding: "20px 18px",
                  background: theme.isDark ? "rgba(255,255,255,0.02)" : "rgba(0,60,160,0.02)",
                  animation: "fadeIn 0.2s ease",
                }}>
                  <p style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'Inter', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
                    Editando: {c.displayName || username} — campos salvos substituem os dados do LDAP
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle(theme)}>Ramal</label>
                      <input
                        type="text" value={form.ramal}
                        onChange={e => setForm(f => ({ ...f, ramal: e.target.value }))}
                        placeholder="Ex: 2033-4890"
                        style={inputStyle(theme)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle(theme)}>Cargo / Função</label>
                      <input
                        type="text" value={form.cargo}
                        onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                        placeholder="Ex: Analista de TI"
                        style={inputStyle(theme)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle(theme)}>Unidade (sigla)</label>
                      <input
                        type="text" value={form.unidade}
                        onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                        placeholder="Ex: CTI"
                        style={inputStyle(theme)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle(theme)}>Data de Aniversário</label>
                      <input
                        type="text" value={form.data_aniversario}
                        onChange={e => setForm(f => ({ ...f, data_aniversario: e.target.value }))}
                        placeholder="Ex: 15/04/2026"
                        style={inputStyle(theme)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <div
                        onClick={() => setForm(f => ({ ...f, visivel: !f.visivel }))}
                        style={{
                          width: 44, height: 24, borderRadius: 12, position: "relative",
                          background: form.visivel ? "#1565c0" : (theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"),
                          transition: "background 0.2s", cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        <div style={{
                          position: "absolute", top: 3, left: form.visivel ? 23 : 3,
                          width: 18, height: 18, borderRadius: "50%", background: "white",
                          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }} />
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: theme.textPrimary }}>
                        Visível na página inicial
                      </span>
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => salvar(username)}
                      disabled={salvando}
                      style={{
                        background: "linear-gradient(135deg,#1565c0,#0d47a1)",
                        border: "none", borderRadius: 7, color: "#fff",
                        padding: "9px 24px", fontSize: 13,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600, letterSpacing: "0.06em",
                        cursor: salvando ? "not-allowed" : "pointer",
                        opacity: salvando ? 0.7 : 1,
                      }}
                    >
                      {salvando ? "Salvando..." : "💾 Salvar alterações"}
                    </button>
                    <button
                      onClick={fecharEdicao}
                      style={{
                        background: "transparent", border: `1px solid ${theme.inputBorder}`,
                        borderRadius: 7, color: theme.textSecondary,
                        padding: "9px 18px", fontSize: 13,
                        fontFamily: "'Inter', sans-serif", cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Aba: Capas
// -------------------------------------------------------------------
function AbaCapas() {
  const theme = useTheme();
  // As capas são inicializadas com o que existe na pasta física.
  const [capas, setCapas] = useState(CAPAS_REAIS);

  return (
    <div>
      <SectionTitle>🖼 Gerenciar Capas</SectionTitle>

      <div style={{ background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,60,160,0.03)", border: theme.rowBorder, borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "'Inter', sans-serif" }}>
          As capas listadas abaixo são lidas dinamicamente da pasta <strong>public/assinatura/</strong> no código-fonte. 
          <br/>Para adicionar ou remover fisicamente uma imagem, faça a alteração diretamente na pasta do projeto.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {capas.map(capa => (
          <div key={capa.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: theme.tableBg, border: theme.tableBorder,
            borderRadius: 8, padding: "14px 18px", opacity: capa.ativa ? 1 : 0.55,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 6, background: theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,60,160,0.06)", border: theme.rowBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🖼</div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, color: theme.textPrimary }}>{capa.nome}</div>
                <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>{capa.arquivo}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge ativo={capa.ativa} label={capa.ativa ? "ATIVA" : "INATIVA"} />
              <button onClick={() => setCapas(p => p.map(c => c.id === capa.id ? { ...c, ativa: !c.ativa } : c))} style={{ background: "transparent", border: `1px solid ${theme.inputBorder}`, borderRadius: 6, color: theme.textSecondary, padding: "5px 12px", fontSize: 12, fontFamily: "'Inter', sans-serif", cursor: "pointer" }}>
                {capa.ativa ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
        {capas.length === 0 && (
          <p style={{ color: theme.textMuted, fontSize: 13, fontFamily: "'Inter', sans-serif", textAlign: "center", padding: "20px" }}>Nenhuma capa encontrada na pasta public/assinatura/.</p>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Aba: Gerar Assinatura (admin — todos os campos liberados)
// -------------------------------------------------------------------
function AbaAssinatura() {
  const theme = useTheme();
  const canvasRef = useState(null);
  const [canvasEl, setCanvasEl] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorId, setColaboradorId] = useState("");
  const [capaId, setCapaId] = useState("");
  const [form, setForm] = useState({ nome: "", cargo: "", lotacao: "", ramal: "", email: "" });
  const [preview, setPreview] = useState(null);
  const [capaDropdownOpen, setCapaDropdownOpen] = useState(false);
  const [colabDropdownOpen, setColabDropdownOpen] = useState(false);

  useEffect(() => {
    fetchColaboradoresAdmin().then(setColaboradores).catch(() => setColaboradores([]));
  }, []);

  const colaborador = colaboradores.find(c => c.sAMAccountName === colaboradorId);

  useEffect(() => {
    if (!colaborador) return;
    setForm({
      nome:    colaborador.displayName || colaborador.cn || "",
      cargo:   colaborador.title || "",
      lotacao: colaborador.department || "",
      ramal:   colaborador.telephoneNumber || "",
      email:   colaborador.mail || "",
    });
  }, [colaboradorId]);

  function gerar() {
    const canvas = canvasEl;
    if (!canvas || !form.nome) return;
    const ctx = canvas.getContext("2d");

    const desenharComFallback = () => {
      canvas.width = 700; canvas.height = 180;
      ctx.fillStyle = "#0d1f3c"; ctx.fillRect(0, 0, 700, 180);
      const textX = 195, startY = 45, lineH = 22;
      ctx.font = "bold 18px Arial"; ctx.fillStyle = "#FFFFFF";
      ctx.fillText(form.nome, textX, startY);
      ctx.font = "13px Arial"; ctx.fillStyle = "#90caf9";
      ctx.fillText(form.cargo, textX, startY + lineH);
      ctx.font = "13px Arial"; ctx.fillStyle = "#CCDDEE";
      const lotacao = form.lotacao;
      if (lotacao.length > 45) {
        const mid = lotacao.lastIndexOf(" ", 45);
        ctx.fillText(lotacao.substring(0, mid), textX, startY + lineH * 2);
        ctx.fillText(lotacao.substring(mid + 1), textX, startY + lineH * 3 - 4);
        ctx.font = "bold 14px Arial"; ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Agência Espacial Brasileira", textX, startY + lineH * 4 - 4);
        ctx.font = "13px Arial"; ctx.fillStyle = "#CCDDEE";
        ctx.fillText(`(61) ${form.ramal}    ${form.email}`, textX, startY + lineH * 5 - 4);
      } else {
        ctx.fillText(lotacao, textX, startY + lineH * 2);
        ctx.font = "bold 14px Arial"; ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Agência Espacial Brasileira", textX, startY + lineH * 3);
        ctx.font = "13px Arial"; ctx.fillStyle = "#CCDDEE";
        ctx.fillText(`(61) ${form.ramal}    ${form.email}`, textX, startY + lineH * 4);
      }
      setPreview(canvas.toDataURL("image/png"));
    };

    const capa = CAPAS_REAIS.find(c => c.id === Number(capaId));
    if (capa) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = capa.arquivo;

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const textX = canvas.width * 0.305;
        let currentY = canvas.height * 0.30;
        const lineSpacing = canvas.height * 0.14;

        const fontNome = Math.round(canvas.height * 0.110);
        const fontMedia = Math.round(canvas.height * 0.075);
        const fontAeb = Math.round(canvas.height * 0.098);

        ctx.font = `bold ${fontNome}px 'Times New Roman', Times, serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(form.nome, textX, currentY);
        currentY += lineSpacing;

        ctx.font = `${fontMedia}px 'Times New Roman', Times, serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(form.cargo, textX, currentY);
        currentY += lineSpacing - (canvas.height * 0.01);

        ctx.font = `${fontMedia}px 'Times New Roman', Times, serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(form.lotacao, textX, currentY);
        currentY += lineSpacing + (canvas.height * 0.02);

        ctx.font = `bold ${fontAeb}px 'Times New Roman', Times, serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Agência Espacial Brasileira", textX, currentY);
        currentY += lineSpacing;

        let ramalFormatado = form.ramal || "";
        const apenasDigitos = String(ramalFormatado).replace(/\D/g, '');
        const digitosFinais = apenasDigitos.slice(-4);
        ramalFormatado = `(61) 2033-${digitosFinais || "XXXX"}`;

        ctx.font = `${fontMedia}px 'Times New Roman', Times, serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`${ramalFormatado}    ${form.email}`, textX, currentY);

        setPreview(canvas.toDataURL("image/png"));
      };

      img.onerror = () => {
        desenharComFallback();
      };
    } else {
      desenharComFallback();
    }
  }

  const f = (field) => (
    <input
      type="text" value={form[field]}
      onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
      style={inputStyle(theme)}
    />
  );

  return (
    <div>
      <SectionTitle>✍ Gerar Assinatura — Modo Admin</SectionTitle>
      <p style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>
        Todos os campos são editáveis. Selecione um colaborador para pré-preencher ou preencha manualmente.
      </p>

      <div style={{ background: theme.tableBg, border: theme.tableBorder, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle(theme)}>Colaborador (opcional)</label>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setColabDropdownOpen(o => !o); setCapaDropdownOpen(false); }}
                style={{
                  ...inputStyle(theme), cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis", position: "relative"
                }}
              >
                {colaborador ? (colaborador.displayName || colaborador.sAMAccountName) : "Preencher manualmente..."}
                <span style={{
                  position: "absolute", right: 14, top: "50%", transform: `translateY(-50%) rotate(${colabDropdownOpen ? 180 : 0}deg)`,
                  transition: "transform 0.2s", color: theme.inputPlaceholder || theme.textMuted, fontSize: 10
                }}>▼</span>
              </button>

              {colabDropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, width: "100%",
                  background: theme.dropdownBg || (theme.isDark ? "#1a2a4a" : "#fff"),
                  border: `1px solid ${theme.dropdownBorder || theme.inputBorder}`,
                  borderRadius: 8, maxHeight: 250, overflowY: "auto", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.3)"
                }}>
                  <div
                    onClick={() => { setColaboradorId(""); setColabDropdownOpen(false); }}
                    style={{
                      padding: "9px 16px", fontSize: 13, cursor: "pointer",
                      color: !colaboradorId ? theme.textAccent : theme.textSecondary,
                      background: !colaboradorId ? (theme.dropdownSelected || (theme.isDark ? "rgba(100,150,255,0.1)" : "rgba(0,100,255,0.05)")) : "transparent",
                      fontStyle: "italic"
                    }}
                    onMouseEnter={e => { if (colaboradorId) e.currentTarget.style.background = theme.dropdownHover || (theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"); }}
                    onMouseLeave={e => { if (colaboradorId) e.currentTarget.style.background = "transparent"; }}
                  >
                    Preencher manualmente...
                  </div>
                  {colaboradores.map(c => (
                    <div
                      key={c.sAMAccountName}
                      onClick={() => { setColaboradorId(c.sAMAccountName); setColabDropdownOpen(false); }}
                      style={{
                        padding: "9px 16px", fontSize: 13, cursor: "pointer",
                        color: c.sAMAccountName === colaboradorId ? theme.textAccent : theme.textSecondary,
                        background: c.sAMAccountName === colaboradorId ? (theme.dropdownSelected || (theme.isDark ? "rgba(100,150,255,0.1)" : "rgba(0,100,255,0.05)")) : "transparent",
                      }}
                      onMouseEnter={e => { if (c.sAMAccountName !== colaboradorId) e.currentTarget.style.background = theme.dropdownHover || (theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"); }}
                      onMouseLeave={e => { if (c.sAMAccountName !== colaboradorId) e.currentTarget.style.background = "transparent"; }}
                    >
                      {c.displayName || c.sAMAccountName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label style={labelStyle(theme)}>Capa</label>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setCapaDropdownOpen(o => !o); setColabDropdownOpen(false); }}
                style={{
                  ...inputStyle(theme), cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis", position: "relative"
                }}
              >
                {capaId ? (CAPAS_REAIS.find(c => c.id === Number(capaId))?.nome || "Sem capa (fundo padrão)") : "Sem capa (fundo padrão)"}
                <span style={{
                  position: "absolute", right: 14, top: "50%", transform: `translateY(-50%) rotate(${capaDropdownOpen ? 180 : 0}deg)`,
                  transition: "transform 0.2s", color: theme.inputPlaceholder || theme.textMuted, fontSize: 10
                }}>▼</span>
              </button>

              {capaDropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, width: "100%",
                  background: theme.dropdownBg || (theme.isDark ? "#1a2a4a" : "#fff"),
                  border: `1px solid ${theme.dropdownBorder || theme.inputBorder}`,
                  borderRadius: 8, maxHeight: 250, overflowY: "auto", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.3)"
                }}>
                  <div
                    onClick={() => { setCapaId(""); setCapaDropdownOpen(false); }}
                    style={{
                      padding: "9px 16px", fontSize: 13, cursor: "pointer",
                      color: !capaId ? theme.textAccent : theme.textSecondary,
                      background: !capaId ? (theme.dropdownSelected || (theme.isDark ? "rgba(100,150,255,0.1)" : "rgba(0,100,255,0.05)")) : "transparent",
                      fontStyle: "italic"
                    }}
                    onMouseEnter={e => { if (capaId) e.currentTarget.style.background = theme.dropdownHover || (theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"); }}
                    onMouseLeave={e => { if (capaId) e.currentTarget.style.background = "transparent"; }}
                  >
                    Sem capa (fundo padrão)
                  </div>
                  {CAPAS_REAIS.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setCapaId(c.id); setCapaDropdownOpen(false); }}
                      style={{
                        padding: "9px 16px", fontSize: 13, cursor: "pointer",
                        color: c.id === Number(capaId) ? theme.textAccent : theme.textSecondary,
                        background: c.id === Number(capaId) ? (theme.dropdownSelected || (theme.isDark ? "rgba(100,150,255,0.1)" : "rgba(0,100,255,0.05)")) : "transparent",
                      }}
                      onMouseEnter={e => { if (c.id !== Number(capaId)) e.currentTarget.style.background = theme.dropdownHover || (theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"); }}
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div><label style={labelStyle(theme)}>Nome completo</label>{f("nome")}</div>
          <div><label style={labelStyle(theme)}>Cargo / Função</label>{f("cargo")}</div>
          <div><label style={labelStyle(theme)}>Lotação / Coordenação</label>{f("lotacao")}</div>
          <div><label style={labelStyle(theme)}>Ramal</label>{f("ramal")}</div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle(theme)}>E-mail</label>{f("email")}</div>
        </div>

        <button onClick={gerar} disabled={!form.nome} style={{
          background: form.nome ? "linear-gradient(135deg,#1565c0,#0d47a1)" : theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          border: "none", borderRadius: 8, color: form.nome ? "#fff" : theme.textMuted,
          padding: "10px 28px", fontSize: 14, fontFamily: "'Inter', sans-serif",
          fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
          cursor: form.nome ? "pointer" : "not-allowed",
        }}>
          ✦ Gerar Preview
        </button>
      </div>

      {preview && (
        <div style={{ background: theme.tableBg, border: theme.tableBorder, borderRadius: 12, padding: 24, animation: "fadeIn 0.3s ease" }}>
          <SectionTitle>Preview</SectionTitle>
          <div style={{ background: theme.isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)", borderRadius: 8, padding: 20, display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <img src={preview} alt="Preview" style={{ maxWidth: "100%", borderRadius: 6 }} />
          </div>
          <button onClick={() => { const a = document.createElement("a"); a.href = preview; a.download = `assinatura-${form.nome.split(" ")[0].toLowerCase()}.png`; a.click(); }}
            style={{ background: "linear-gradient(135deg,#2e7d32,#1b5e20)", border: "none", borderRadius: 8, color: "#fff", padding: "10px 28px", fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
            ↓ Baixar PNG
          </button>
        </div>
      )}

      <canvas ref={setCanvasEl} style={{ display: "none" }} />
    </div>
  );
}

// -------------------------------------------------------------------
// Aba: Logs
// -------------------------------------------------------------------
function AbaLogs() {
  const theme = useTheme();
  const logs = [
    { id: 1, usuario: "gabriel.silva",   nome: "Gabriel Silva",          capa: "Padrão Espacial", data: "2024-06-10 09:14" },
    { id: 2, usuario: "ana.paula",       nome: "Ana Paula Ferreira",     capa: "Satélite",        data: "2024-06-10 10:02" },
    { id: 3, usuario: "carlos.monteiro", nome: "Carlos Monteiro",        capa: "Lançador",        data: "2024-06-11 08:45" },
    { id: 4, usuario: "fernanda.lima",   nome: "Fernanda Lima Carvalho", capa: "Padrão Espacial", data: "2024-06-11 14:30" },
  ];
  const [filtro, setFiltro] = useState("");
  const filtrados = logs.filter(l => l.nome.toLowerCase().includes(filtro.toLowerCase()) || l.usuario.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div>
      <SectionTitle>📋 Logs de Assinaturas Geradas</SectionTitle>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <input type="text" placeholder="Buscar..." value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inputStyle(theme), width: 300, paddingRight: 36 }} />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>🔍</span>
      </div>
      <div style={{ background: theme.tableBg, border: theme.tableBorder, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 140px", gap: 16, padding: "10px 18px", background: theme.tableHeaderBg, borderBottom: theme.rowBorder }}>
          {["USUÁRIO", "NOME", "CAPA USADA", "DATA/HORA"].map(h => (
            <div key={h} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.12em", color: theme.tableHeaderColor }}>{h}</div>
          ))}
        </div>
        {filtrados.map(log => (
          <div key={log.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 140px", gap: 16, padding: "12px 18px", borderBottom: theme.rowBorder }}
            onMouseEnter={e => e.currentTarget.style.background = theme.rowHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: theme.textAccent }}>{log.usuario}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: theme.textPrimary }}>{log.nome}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: theme.textSecondary }}>{log.capa}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: theme.textMuted }}>{log.data}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Página Admin principal
// -------------------------------------------------------------------
export default function Admin() {
  const [abaAtiva, setAbaAtiva] = useState("usuarios");
  const navigate = useNavigate();
  const theme = useTheme();
  const { user, logout } = useAuth();

  const abas = [
    { id: "usuarios",   label: "👥 Usuários"   },
    { id: "assinatura", label: "✍ Assinatura"  },
    { id: "capas",      label: "🖼 Capas"       },
    { id: "logs",       label: "📋 Logs"        },
  ];

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg, transition: "background 0.4s", fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <header style={{
        background: theme.headerBg, borderBottom: theme.headerBorder,
        padding: "0 32px", height: 64, display: "flex", alignItems: "center",
        justifyContent: "space-between", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/")} style={{ background: "transparent", border: `1px solid ${theme.inputBorder}`, borderRadius: 6, color: theme.textSecondary, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background = theme.rowHover}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ← Início
          </button>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 18, color: theme.textPrimary, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            🛰 AEB
            <span style={{ marginLeft: 12, paddingLeft: 12, borderLeft: `1px solid ${theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,60,160,0.15)"}`, fontWeight: 600, fontSize: 16, color: theme.textAccent }}>
              Painel Admin
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: "'Inter', sans-serif" }}>👤 {user?.displayName || user?.username}</span>
          <button onClick={theme.toggleTheme} style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, transition: "transform 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
            {theme.isDark ? "☀️" : "🌙"}
          </button>
          <button onClick={() => { logout(); navigate("/login"); }} style={{ background: "rgba(198,40,40,0.1)", border: "1px solid rgba(198,40,40,0.3)", borderRadius: 6, color: "#ef9a9a", padding: "7px 14px", fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: "0.06em", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(198,40,40,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(198,40,40,0.1)"}>
            Sair
          </button>
        </div>
      </header>

      <main style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Abas */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `1px solid ${theme.isDark ? "rgba(100,150,255,0.1)" : "rgba(0,60,160,0.1)"}` }}>
          {abas.map(aba => (
            <button key={aba.id} onClick={() => setAbaAtiva(aba.id)} style={{
              background: "transparent", border: "none",
              borderBottom: abaAtiva === aba.id ? `2px solid ${theme.textAccent}` : "2px solid transparent",
              borderRadius: 0, color: abaAtiva === aba.id ? theme.textAccent : theme.textMuted,
              padding: "10px 20px", fontSize: 13,
              fontFamily: "'Inter', sans-serif", fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -1,
            }}>
              {aba.label}
            </button>
          ))}
        </div>

        <div style={{ animation: "fadeIn 0.25s ease" }} key={abaAtiva}>
          {abaAtiva === "usuarios"   && <AbaUsuarios />}
          {abaAtiva === "assinatura" && <AbaAssinatura />}
          {abaAtiva === "capas"      && <AbaCapas />}
          {abaAtiva === "logs"       && <AbaLogs />}
        </div>
      </main>
    </div>
  );
}
