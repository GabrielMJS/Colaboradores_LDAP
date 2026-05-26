import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { fetchColaboradoresAdmin, saveOverride, deleteOverride, fetchCapas, uploadCapa, deleteCapa, uploadUserPhoto, deleteUserPhoto, fetchDepartamentosAdmin, createDepartamento, updateDepartamento, deleteDepartamento } from "../services/api";

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
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [filtroDropdownOpen, setFiltroDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [editando, setEditando] = useState(null); // username em edição
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState({ id: null, msg: "" });
  const [uploadingFoto, setUploadingFoto] = useState(false);

  useEffect(() => {
    fetchColaboradoresAdmin()
      .then(setColaboradores)
      .catch(() => setColaboradores([]))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setFiltroDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unidadesDisponiveis = useMemo(() => {
    const unis = new Set();
    colaboradores.forEach(c => {
      const u = (c.ou || c.unidade || "").trim();
      if (u) unis.add(u);
    });
    return Array.from(unis).sort();
  }, [colaboradores]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return colaboradores.filter(c => {
      const matchesSearch = (c.displayName || "").toLowerCase().includes(q) ||
        (c.sAMAccountName || "").toLowerCase().includes(q) ||
        (c.department || "").toLowerCase().includes(q);
      
      const cUnit = (c.ou || c.unidade || "").trim();
      const matchesUnit = !unidadeFiltro || cUnit === unidadeFiltro;
      
      return matchesSearch && matchesUnit;
    });
  }, [colaboradores, busca, unidadeFiltro]);

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

  async function handleFotoUpload(e, username) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const res = await uploadUserPhoto(username, file);
      const timestamp = new Date().getTime();
      setColaboradores(prev => prev.map(c => 
        c.sAMAccountName === username ? { ...c, foto: `${res.foto_url}?t=${timestamp}` } : c
      ));
      setFeedback({ id: username, msg: "✓ Foto atualizada!" });
      setTimeout(() => setFeedback({ id: null, msg: "" }), 2500);
    } catch (err) {
      setFeedback({ id: username, msg: `⚠ Erro: ${err.message}` });
    } finally {
      setUploadingFoto(false);
      e.target.value = null;
    }
  }

  async function handleFotoDelete(username) {
    if (!window.confirm("Deseja remover a foto deste usuário?")) return;
    try {
      await deleteUserPhoto(username);
      setColaboradores(prev => prev.map(c => 
        c.sAMAccountName === username ? { ...c, foto: null } : c
      ));
      setFeedback({ id: username, msg: "✓ Foto removida!" });
      setTimeout(() => setFeedback({ id: null, msg: "" }), 2500);
    } catch (err) {
      setFeedback({ id: username, msg: `⚠ Erro ao remover foto` });
    }
  }

  if (carregando) return (
    <div style={{ padding: 48, textAlign: "center", color: theme.textMuted, fontFamily: "'Inter', sans-serif" }}>
      Carregando colaboradores...
    </div>
  );

  return (
    <div>
      <SectionTitle>👥 Gerenciar Colaboradores</SectionTitle>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text" placeholder="Buscar por nome, login ou lotação..."
              value={busca} onChange={e => setBusca(e.target.value)}
              style={{ ...inputStyle(theme), width: 320, paddingRight: 36 }}
            />
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>🔍</span>
          </div>

          {/* Dropdown de Unidade Customizado */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setFiltroDropdownOpen(o => !o)}
              style={{
                ...inputStyle(theme),
                width: 200,
                height: 38,
                textAlign: "left",
                cursor: "pointer",
                paddingRight: 32,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                position: "relative",
                color: unidadeFiltro === "" ? theme.inputPlaceholder : theme.inputColor,
              }}
            >
              {unidadeFiltro || "Todas as unidades"}
              <span style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: `translateY(-50%) rotate(${filtroDropdownOpen ? 180 : 0}deg)`,
                transition: "transform 0.2s",
                color: theme.inputPlaceholder || theme.textMuted,
                fontSize: 10,
              }}>▼</span>
            </button>

            {filtroDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                width: 260,
                background: theme.dropdownBg,
                border: `1px solid ${theme.dropdownBorder}`,
                borderRadius: 8,
                maxHeight: 250,
                overflowY: "auto",
                zIndex: 200,
                boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
              }}>
                <div
                  onClick={() => { setUnidadeFiltro(""); setFiltroDropdownOpen(false); }}
                  style={{
                    padding: "9px 16px",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    color: unidadeFiltro === "" ? theme.textAccent : theme.textSecondary,
                    background: unidadeFiltro === "" ? theme.dropdownSelected : "transparent",
                    transition: "background 0.15s",
                    fontStyle: "italic",
                  }}
                  onMouseEnter={e => { if (unidadeFiltro !== "") e.currentTarget.style.background = theme.dropdownHover; }}
                  onMouseLeave={e => { if (unidadeFiltro !== "") e.currentTarget.style.background = "transparent"; }}
                >
                  Todas as unidades
                </div>
                {unidadesDisponiveis.map(u => (
                  <div
                    key={u}
                    onClick={() => { setUnidadeFiltro(u); setFiltroDropdownOpen(false); }}
                    style={{
                      padding: "9px 16px",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      color: u === unidadeFiltro ? theme.textAccent : theme.textSecondary,
                      background: u === unidadeFiltro ? theme.dropdownSelected : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (u !== unidadeFiltro) e.currentTarget.style.background = theme.dropdownHover; }}
                    onMouseLeave={e => { if (u !== unidadeFiltro) e.currentTarget.style.background = "transparent"; }}
                  >
                    {u}
                  </div>
                ))}
              </div>
            )}
          </div>
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
                <Avatar 
                  foto={c.foto} 
                  nome={c.displayName || username} 
                  size={40} 
                />

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

                  <div style={{ display: "flex", gap: 24, marginBottom: 20, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={labelStyle(theme)}>Foto de Perfil</label>
                        <div style={{ display: "flex", gap: 10 }}>
                          <input type="file" accept=".jpg,.jpeg,.png" id={`upload-foto-${username}`} style={{ display: "none" }} onChange={(e) => handleFotoUpload(e, username)} disabled={uploadingFoto} />
                          <label htmlFor={`upload-foto-${username}`} style={{
                            background: "transparent", border: `1px solid ${theme.inputBorder}`,
                            borderRadius: 6, color: theme.textSecondary,
                            padding: "6px 12px", fontSize: 12, fontFamily: "'Inter', sans-serif",
                            cursor: uploadingFoto ? "not-allowed" : "pointer", opacity: uploadingFoto ? 0.6 : 1
                          }}>
                            {uploadingFoto ? "Enviando..." : "⬆ Alterar Foto"}
                          </label>
                          {c.foto && !c.foto.startsWith("data:") && (
                            <button onClick={() => handleFotoDelete(username)} style={{
                              background: "transparent", border: "1px solid rgba(198,40,40,0.3)",
                              borderRadius: 6, color: "#ef9a9a", padding: "6px 12px", fontSize: 12,
                              fontFamily: "'Inter', sans-serif", cursor: "pointer"
                            }}>
                              🗑 Remover Foto
                            </button>
                          )}
                        </div>
                      </div>
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
  const [capas, setCapas] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    carregarCapas();
  }, []);

  async function carregarCapas() {
    try {
      const data = await fetchCapas();
      setCapas(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadCapa(file);
      await carregarCapas();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  }

  async function handleDelete(nome) {
    if (!window.confirm(`Tem certeza que deseja excluir permanentemente o arquivo "${nome}"? Esta ação não pode ser desfeita.`)) return;
    
    try {
      await deleteCapa(nome);
      await carregarCapas();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <SectionTitle>🖼 Gerenciar Capas</SectionTitle>

      <div style={{ background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,60,160,0.03)", border: theme.rowBorder, borderRadius: 10, padding: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 13, color: theme.textSecondary, fontFamily: "'Inter', sans-serif", margin: 0 }}>
          As capas listadas abaixo são lidas dinamicamente do servidor. 
          <br/>Você pode adicionar novas capas enviando arquivos .png.
        </p>
        <div>
          <input type="file" accept=".png" id="upload-capa" style={{ display: "none" }} onChange={handleUpload} />
          <label htmlFor="upload-capa" style={{
            background: "linear-gradient(135deg,#1565c0,#0d47a1)",
            border: "none", borderRadius: 8, color: "#fff",
            padding: "10px 20px", fontSize: 13, fontFamily: "'Inter', sans-serif",
            fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1,
            display: "inline-block"
          }}>
            {uploading ? "Enviando..." : "⬆ Importar .png"}
          </label>
        </div>
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
              {!capa.ativa && (
                <button 
                  onClick={() => handleDelete(capa.nome)} 
                  title="Excluir permanentemente"
                  style={{ 
                    background: "#f44336", // Vermelho vibrante
                    border: "none", 
                    borderRadius: 6, // Quadrado com bordas arredondadas
                    color: "#ffffff", 
                    width: 32, 
                    height: 32, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    cursor: "pointer", 
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(244, 67, 54, 0.3)"
                  }} 
                  onMouseEnter={e => { e.currentTarget.style.background = "#d32f2f"; e.currentTarget.style.transform = "scale(1.05)"; }} 
                  onMouseLeave={e => { e.currentTarget.style.background = "#f44336"; e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
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
// Aba: Siglas
// -------------------------------------------------------------------
function AbaSiglas() {
  const theme = useTheme();
  const [siglas, setSiglas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null); // ID da sigla em edição
  const [form, setForm] = useState({ sigla: "", nome_oficial: "", diretoria_pai: "", ativo: true });
  const [adicionando, setAdicionando] = useState(false);
  const [feedback, setFeedback] = useState({ id: null, msg: "" });

  useEffect(() => {
    carregarSiglas();
  }, []);

  async function carregarSiglas() {
    setCarregando(true);
    try {
      const data = await fetchDepartamentosAdmin();
      setSiglas(data);
    } catch (e) {
      console.error(e);
      setSiglas([]);
    } finally {
      setCarregando(false);
    }
  }

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return siglas.filter(s => 
      (s.sigla || "").toLowerCase().includes(q) ||
      (s.nome_oficial || "").toLowerCase().includes(q) ||
      (s.diretoria_pai || "").toLowerCase().includes(q)
    );
  }, [siglas, busca]);

  function abrirEdicao(s) {
    setEditando(s.id);
    setForm({
      sigla: s.sigla || "",
      nome_oficial: s.nome_oficial || "",
      diretoria_pai: s.diretoria_pai || "",
      ativo: s.ativo !== false,
    });
  }

  function fecharEdicao() {
    setEditando(null);
    setForm({ sigla: "", nome_oficial: "", diretoria_pai: "", ativo: true });
  }

  async function salvarEdicao(id) {
    if (!form.sigla.trim() || !form.nome_oficial.trim()) {
      alert("Por favor, preencha a sigla e o nome por extenso.");
      return;
    }
    setSalvando(true);
    try {
      await updateDepartamento(id, form);
      setSiglas(prev => prev.map(s => {
        if (s.id !== id) return s;
        return {
          ...s,
          sigla: form.sigla.trim().toUpperCase(),
          nome_oficial: form.nome_oficial.trim(),
          diretoria_pai: form.diretoria_pai.trim().toUpperCase(),
          ativo: form.ativo,
        };
      }));
      setFeedback({ id, msg: "✓ Atualizado!" });
      setTimeout(() => setFeedback({ id: null, msg: "" }), 2500);
      fecharEdicao();
    } catch (err) {
      setFeedback({ id, msg: `⚠ Erro: ${err.message}` });
    } finally {
      setSalvando(false);
    }
  }

  async function salvarNova() {
    if (!form.sigla.trim() || !form.nome_oficial.trim()) {
      alert("Por favor, preencha a sigla e o nome por extenso.");
      return;
    }
    setSalvando(true);
    try {
      const res = await createDepartamento(form);
      const novaSiglaObj = {
        id: res.id,
        sigla: form.sigla.trim().toUpperCase(),
        nome_oficial: form.nome_oficial.trim(),
        diretoria_pai: form.diretoria_pai.trim().toUpperCase(),
        ativo: form.ativo,
      };
      setSiglas(prev => [novaSiglaObj, ...prev]);
      setFeedback({ id: "nova", msg: "✓ Criado com sucesso!" });
      setTimeout(() => setFeedback({ id: null, msg: "" }), 2500);
      setAdicionando(false);
      setForm({ sigla: "", nome_oficial: "", diretoria_pai: "", ativo: true });
    } catch (err) {
      alert(`Erro ao criar sigla: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirSigla(id, siglaNome) {
    if (!window.confirm(`Deseja realmente excluir permanentemente a sigla "${siglaNome}"?`)) return;
    try {
      await deleteDepartamento(id);
      setSiglas(prev => prev.filter(s => s.id !== id));
      fecharEdicao();
    } catch (err) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  }

  async function toggleAtivo(s) {
    const novoValor = s.ativo === false ? true : false;
    try {
      await updateDepartamento(s.id, {
        sigla: s.sigla,
        nome_oficial: s.nome_oficial,
        diretoria_pai: s.diretoria_pai,
        ativo: novoValor
      });
      setSiglas(prev => prev.map(item => 
        item.id === s.id ? { ...item, ativo: novoValor } : item
      ));
    } catch (err) {
      alert(`Erro ao alterar status: ${err.message}`);
    }
  }

  if (carregando) return (
    <div style={{ padding: 48, textAlign: "center", color: theme.textMuted, fontFamily: "'Inter', sans-serif" }}>
      Carregando siglas...
    </div>
  );

  return (
    <div>
      <SectionTitle>🏷 Gerenciar Siglas de Coordenações</SectionTitle>

      {/* Painel do Topo: Adicionar Nova e Busca */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          
          <div style={{ position: "relative", flex: 1, minWidth: 280, maxWidth: 400 }}>
            <input
              type="text" placeholder="Buscar por coordenação, diretoria ou nome por extenso..."
              value={busca} onChange={e => setBusca(e.target.value)}
              style={{ ...inputStyle(theme), paddingRight: 36 }}
            />
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}>🔍</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                setAdicionando(!adicionando);
                fecharEdicao();
                setForm({ sigla: "", nome_oficial: "", diretoria_pai: "", ativo: true });
              }}
              style={{
                background: adicionando ? "transparent" : "linear-gradient(135deg,#1565c0,#0d47a1)",
                border: adicionando ? `1px solid ${theme.inputBorder}` : "none",
                borderRadius: 8, color: adicionando ? theme.textSecondary : "#fff",
                padding: "10px 20px", fontSize: 13, fontFamily: "'Inter', sans-serif",
                fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
              }}
            >
              {adicionando ? "Cancelar" : "+ Adicionar Nova"}
            </button>
            <span style={{ fontSize: 12, color: theme.textMuted, alignSelf: "center", fontFamily: "'Inter', sans-serif" }}>
              {filtradas.length} de {siglas.length} siglas
            </span>
          </div>
        </div>

        {/* Formulário de Adicionar Nova Sigla */}
        {adicionando && (
          <div style={{
            background: theme.tableBg, border: theme.tableBorder, borderRadius: 10,
            padding: 20, animation: "fadeIn 0.2s ease",
            boxShadow: theme.isDark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 4px 20px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 700, color: theme.textPrimary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              ✨ Adicionar Nova Sigla / Coordenação
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle(theme)}>Sigla da Coordenação *</label>
                <input
                  type="text" value={form.sigla}
                  onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))}
                  placeholder="Ex: CTI"
                  style={inputStyle(theme)}
                />
              </div>
              <div>
                <label style={labelStyle(theme)}>Sigla da Diretoria</label>
                <input
                  type="text" value={form.diretoria_pai}
                  onChange={e => setForm(f => ({ ...f, diretoria_pai: e.target.value }))}
                  placeholder="Ex: DPOA"
                  style={inputStyle(theme)}
                />
              </div>
              <div>
                <label style={labelStyle(theme)}>Nome por Extenso / Lotação *</label>
                <input
                  type="text" value={form.nome_oficial}
                  onChange={e => setForm(f => ({ ...f, nome_oficial: e.target.value }))}
                  placeholder="Ex: Coordenação de Tecnologia da Informação"
                  style={inputStyle(theme)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={salvarNova}
                disabled={salvando}
                style={{
                  background: "linear-gradient(135deg,#2e7d32,#1b5e20)",
                  border: "none", borderRadius: 8, color: "#fff",
                  padding: "9px 24px", fontSize: 13, fontFamily: "'Inter', sans-serif",
                  fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer",
                  opacity: salvando ? 0.7 : 1
                }}
              >
                {salvando ? "Salvando..." : "💾 Salvar Nova Sigla"}
              </button>
              <button
                onClick={() => setAdicionando(false)}
                style={{
                  background: "transparent", border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 8, color: theme.textSecondary,
                  padding: "9px 18px", fontSize: 13, fontFamily: "'Inter', sans-serif",
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listagem em Tabela/Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        
        {/* Cabeçalho da Listagem */}
        <div style={{
          display: "grid", gridTemplateColumns: "180px 180px 1fr 180px",
          alignItems: "center", gap: 16, padding: "8px 18px",
          borderBottom: theme.rowBorder,
          fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: theme.tableHeaderColor || theme.textMuted
        }}>
          <div>Coordenação</div>
          <div>Diretoria</div>
          <div>Lotação (por extenso)</div>
          <div style={{ textAlign: "right" }}>Ações</div>
        </div>

        {/* Linhas da Listagem */}
        {filtradas.map(s => {
          const isEditando = editando === s.id;
          
          return (
            <div key={s.id} style={{
              background: theme.tableBg, border: theme.tableBorder,
              borderRadius: 10, overflow: "hidden",
              transition: "all 0.2s ease",
              borderColor: isEditando ? (theme.isDark ? "rgba(100,150,255,0.35)" : "rgba(0,80,200,0.35)") : undefined,
              boxShadow: isEditando ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
            }}>
              {/* Linha Principal */}
              <div style={{
                display: "grid", gridTemplateColumns: "180px 180px 1fr 180px",
                alignItems: "center", gap: 16, padding: "14px 18px",
                opacity: s.ativo !== false ? 1 : 0.6
              }}>
                {/* Coordenação Sigla */}
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: theme.textAccent }}>
                  {s.sigla}
                  {s.ativo === false && (
                    <span style={{ marginLeft: 8, fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(198,40,40,0.2)", color: "#ef9a9a" }}>
                      INATIVO
                    </span>
                  )}
                </div>

                {/* Diretoria Sigla */}
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: theme.textPrimary }}>
                  {s.diretoria_pai || "—"}
                </div>

                {/* Nome Completo por Extenso */}
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: theme.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={s.nome_oficial}>
                  {s.nome_oficial}
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {feedback.id === s.id && (
                    <span style={{ fontSize: 12, color: "#81c784", fontFamily: "'Inter', sans-serif", alignSelf: "center", marginRight: 6 }}>
                      {feedback.msg}
                    </span>
                  )}
                  <button
                    onClick={() => toggleAtivo(s)}
                    title={s.ativo !== false ? "Desativar sigla" : "Ativar sigla"}
                    style={{
                      background: "transparent", border: `1px solid ${theme.inputBorder}`,
                      borderRadius: 6, color: theme.textSecondary,
                      padding: "5px 10px", fontSize: 12,
                      fontFamily: "'Inter', sans-serif", cursor: "pointer",
                    }}
                  >
                    {s.ativo !== false ? "👁 Ocultar" : "👁 Mostrar"}
                  </button>
                  <button
                    onClick={() => isEditando ? fecharEdicao() : abrirEdicao(s)}
                    style={{
                      background: isEditando ? "transparent" : (theme.isDark ? "rgba(21,101,192,0.2)" : "rgba(21,101,192,0.1)"),
                      border: `1px solid ${theme.isDark ? "rgba(100,150,255,0.3)" : "rgba(21,101,192,0.25)"}`,
                      borderRadius: 6, color: theme.textAccent,
                      padding: "5px 12px", fontSize: 12,
                      fontFamily: "'Inter', sans-serif", fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {isEditando ? "Cancelar" : "✎ Editar"}
                  </button>
                </div>
              </div>

              {/* Formulário de Edição Inline Expansível */}
              {isEditando && (
                <div style={{
                  borderTop: theme.rowBorder,
                  padding: "20px 18px",
                  background: theme.isDark ? "rgba(255,255,255,0.02)" : "rgba(0,60,160,0.02)",
                  animation: "fadeIn 0.2s ease",
                }}>
                  <p style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'Inter', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
                    Editando Sigla: {s.sigla} — alterações serão aplicadas globalmente
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle(theme)}>Sigla da Coordenação</label>
                      <input
                        type="text" value={form.sigla}
                        onChange={e => setForm(f => ({ ...f, sigla: e.target.value }))}
                        style={inputStyle(theme)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle(theme)}>Sigla da Diretoria</label>
                      <input
                        type="text" value={form.diretoria_pai}
                        onChange={e => setForm(f => ({ ...f, diretoria_pai: e.target.value }))}
                        style={inputStyle(theme)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle(theme)}>Lotação / Nome por Extenso</label>
                      <input
                        type="text" value={form.nome_oficial}
                        onChange={e => setForm(f => ({ ...f, nome_oficial: e.target.value }))}
                        style={inputStyle(theme)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <div
                        onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                        style={{
                          width: 44, height: 24, borderRadius: 12, position: "relative",
                          background: form.ativo ? "#1565c0" : (theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"),
                          transition: "background 0.2s", cursor: "pointer", flexShrink: 0,
                        }}
                      >
                        <div style={{
                          position: "absolute", top: 3, left: form.ativo ? 23 : 3,
                          width: 18, height: 18, borderRadius: "50%", background: "white",
                          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }} />
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: theme.textPrimary }}>
                        Ativa no sistema (utilizada para normalização e auto-complete)
                      </span>
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => salvarEdicao(s.id)}
                        disabled={salvando}
                        style={{
                          background: "linear-gradient(135deg,#1565c0,#0d47a1)",
                          border: "none", borderRadius: 7, color: "#fff",
                          padding: "9px 24px", fontSize: 13, fontFamily: "'Inter', sans-serif",
                          fontWeight: 600, cursor: salvando ? "not-allowed" : "pointer",
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
                          padding: "9px 18px", fontSize: 13, fontFamily: "'Inter', sans-serif",
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>

                    <button
                      onClick={() => excluirSigla(s.id, s.sigla)}
                      style={{
                        background: "transparent", border: "1px solid rgba(198,40,40,0.5)",
                        borderRadius: 7, color: "#ef9a9a",
                        padding: "9px 18px", fontSize: 13, fontFamily: "'Inter', sans-serif",
                        fontWeight: 600, cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(198,40,40,0.15)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      🗑 Excluir Sigla
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtradas.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: theme.textMuted, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
            Nenhuma sigla correspondente encontrada.
          </div>
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
  const [form, setForm] = useState({ nome: "", cargo: "", lotacao: "", diretoria: "", ramal: "", email: "" });
  const [preview, setPreview] = useState(null);
  const [capaDropdownOpen, setCapaDropdownOpen] = useState(false);
  const [colabDropdownOpen, setColabDropdownOpen] = useState(false);
  const [filtroColab, setFiltroColab] = useState("");
  const [capas, setCapas] = useState([]);

  useEffect(() => {
    fetchColaboradoresAdmin().then(setColaboradores).catch(() => setColaboradores([]));
    fetchCapas().then(data => {
      setCapas(data);
      if (data.length > 0) setCapaId(String(data[0].id));
    }).catch(() => setCapas([]));
  }, []);

  const colaborador = colaboradores.find(c => c.sAMAccountName === colaboradorId);

  useEffect(() => {
    if (!colaborador) return;
    setForm({
      nome:    colaborador.displayName || colaborador.cn || "",
      cargo:   colaborador.title || "",
      lotacao: colaborador.department || "",
      diretoria: colaborador.diretoria || colaborador.diretoria_sigla || "",
      ramal:   colaborador.telephoneNumber || "",
      email:   colaborador.mail || "",
    });
  }, [colaboradorId]);

  function gerar() {
    const canvas = canvasEl;
    if (!canvas || !form.nome) return;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    const capa = capas.find(c => c.id === Number(capaId));

    const desenharComFallback = () => {
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
      ctx.font = "bold 28px Verdana, sans-serif";
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
      const textX = 176;
      const startY = 40;
      const lineH = 18;
      const ramal = form.ramal || "";
      const email = form.email || "";

      ctx.font = "bold 22px Verdana, sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(form.nome, textX, startY);

      ctx.font = "11px Verdana, sans-serif";
      ctx.fillStyle = "#90caf9";
      ctx.fillText(form.cargo, textX, startY + lineH);

      ctx.font = "11px Verdana, sans-serif";
      ctx.fillStyle = "#CCDDEE";
      ctx.fillText(form.lotacao, textX, startY + lineH * 2);

      // Diretoria
      ctx.font = "11px Verdana, sans-serif";
      ctx.fillStyle = "#CCDDEE";
      ctx.fillText(form.diretoria || "", textX, startY + lineH * 3);

      ctx.font = "bold 14px Verdana, sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Agência Espacial Brasileira", textX, startY + lineH * 4 + 3);

      // Ramal e email
      ctx.font = "11px Verdana, sans-serif";
      ctx.fillStyle = "#CCDDEE";
      ctx.fillText(`(61) ${ramal}     ${email}`, textX, startY + lineH * 5 + 6);

      setPreview(canvas.toDataURL("image/png"));
    };

    if (capa) {
      img.src = capa.arquivo;
      img.onload = () => {
        // Define o tamanho do canvas para o tamanho REAL da imagem
        canvas.width = img.width;
        canvas.height = img.height;

        // Desenha a capa como fundo
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Usando proporções para ficar perfeito em qualquer resolução
        const textX = canvas.width * 0.285 - 5;
        let currentY = canvas.height * 0.31 - 10;
        const lineSpacing = canvas.height * 0.11; // Espaço entre linhas

        // Tamanhos de fonte proporcionais
        const fontNome = Math.round(canvas.height * 0.110) + 4;
        const fontMedia = Math.round(canvas.height * 0.075);
        const fontPeq = fontMedia - 2; // Cargo, coordenação, diretoria, ramal/email
        const fontAeb = Math.round(canvas.height * 0.098);

        // Nome
        ctx.font = `bold ${fontNome}px Verdana, sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(form.nome, textX, currentY);
        currentY += lineSpacing;

        // Cargo
        ctx.font = `${fontPeq}px Verdana, sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(form.cargo, textX, currentY);
        currentY += lineSpacing - (canvas.height * 0.01);

        // Coordenação / Lotação
        ctx.font = `${fontPeq}px Verdana, sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(form.lotacao, textX, currentY);
        currentY += lineSpacing;

        // Diretoria
        ctx.font = `${fontPeq}px Verdana, sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(form.diretoria || "", textX, currentY);

        currentY += lineSpacing + (canvas.height * 0.01);

        // Agência Espacial Brasileira
        ctx.font = `bold ${fontAeb}px Verdana, sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("Agência Espacial Brasileira", textX, currentY);
        currentY += lineSpacing + (canvas.height * 0.01);

        // Tratamento do ramal: garantindo que começará com (61) 2033 -
        let ramal = form.ramal || "";
        const apenasDigitos = String(ramal).replace(/\D/g, '');
        const digitosFinais = apenasDigitos.slice(-4);
        const ramalFormatado = `(61) 2033-${digitosFinais || "XXXX"}`;

        // Ramal e email
        ctx.font = `${fontPeq}px Verdana, sans-serif`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`${ramalFormatado}    ${form.email}`, textX, currentY);

        // Gera preview
        setPreview(canvas.toDataURL("image/png"));
      };
      img.onerror = desenharComFallback;
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
                  borderRadius: 8, maxHeight: 300, overflowY: "auto", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
                  display: "flex", flexDirection: "column"
                }}>
                  {/* Campo de Busca Interno */}
                  <div style={{ position: "sticky", top: 0, background: theme.dropdownBg || (theme.isDark ? "#1a2a4a" : "#fff"), padding: 8, borderBottom: theme.rowBorder, zIndex: 1 }}>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Pesquisar colaborador..."
                      value={filtroColab}
                      onChange={e => setFiltroColab(e.target.value)}
                      style={{ ...inputStyle(theme), fontSize: 12, padding: "6px 10px" }}
                      onClick={e => e.stopPropagation()} 
                    />
                  </div>

                  <div
                    onClick={() => { setColaboradorId(""); setColabDropdownOpen(false); setFiltroColab(""); }}
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

                  {colaboradores
                    .filter(c => 
                      (c.displayName || "").toLowerCase().includes(filtroColab.toLowerCase()) || 
                      (c.sAMAccountName || "").toLowerCase().includes(filtroColab.toLowerCase())
                    )
                    .map(c => (
                      <div
                        key={c.sAMAccountName}
                        onClick={() => { setColaboradorId(c.sAMAccountName); setColabDropdownOpen(false); setFiltroColab(""); }}
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
                  
                  {colaboradores.filter(c => 
                    (c.displayName || "").toLowerCase().includes(filtroColab.toLowerCase()) || 
                    (c.sAMAccountName || "").toLowerCase().includes(filtroColab.toLowerCase())
                  ).length === 0 && (
                    <div style={{ padding: "16px", fontSize: 12, color: theme.textMuted, textAlign: "center" }}>
                      Nenhum resultado encontrado
                    </div>
                  )}
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
                {capaId ? (capas.find(c => c.id === Number(capaId))?.nome || "Selecionar capa...") : "Selecionar capa..."}
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
                    Selecionar capa...
                  </div>
                  {capas.map(c => (
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
          <div><label style={labelStyle(theme)}>Cargo</label>{f("cargo")}</div>
          <div><label style={labelStyle(theme)}>Diretoria</label>{f("diretoria")}</div>
          <div><label style={labelStyle(theme)}>Coordenação</label>{f("lotacao")}</div>
          <div><label style={labelStyle(theme)}>Ramal</label>{f("ramal")}</div>
          <div><label style={labelStyle(theme)}>E-mail</label>{f("email")}</div>
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
    { id: "siglas",     label: "🏷 Siglas"     },
    { id: "assinatura", label: "✍ Assinatura"  },
    { id: "capas",      label: "🖼 Capas"       },
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
          <button onClick={() => navigate("/")} style={{ background: "transparent", border: `1px solid ${theme.inputBorder}`, borderRadius: 6, color: theme.textSecondary, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            ← Voltar
          </button>
          <div style={{ width: 1, height: 24, background: theme.headerBorder }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <img 
              src={theme.isDark ? "/Images/logoBranca.png" : "/Images/logoAzul.png"} 
              alt="Logo AEB" 
              style={{ height: 44, width: "auto", objectFit: "contain", marginRight: 12 }}
            />
            <h1 style={{
              fontSize: 18, fontWeight: 700, color: theme.textPrimary,
              letterSpacing: "-0.02em", margin: 0,
              paddingLeft: 12,
              borderLeft: `1px solid ${theme.rowBorder}`,
            }}>
              Painel <span style={{ color: theme.textAccent }}>Administrativo</span>
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary }}>{user?.nome || "Admin"}</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>{user?.username || "admin"}</div>
          </div>
          <button
            onClick={logout}
            style={{
              background: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
              border: "none", borderRadius: 8, color: theme.textPrimary,
              padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Tabs */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 32,
          background: theme.tableBg, padding: 6, borderRadius: 12,
          border: theme.tableBorder, width: "fit-content",
        }}>
          {abas.map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
                background: abaAtiva === aba.id ? (theme.isDark ? "#1565c0" : "#e3f2fd") : "transparent",
                color: abaAtiva === aba.id ? (theme.isDark ? "#fff" : "#1565c0") : theme.textSecondary,
              }}
            >
              {aba.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ animation: "fadeIn 0.4s ease-out" }}>
          {abaAtiva === "usuarios"   && <AbaUsuarios />}
          {abaAtiva === "siglas"     && <AbaSiglas />}
          {abaAtiva === "assinatura" && <AbaAssinatura />}
          {abaAtiva === "capas"      && <AbaCapas />}
        </div>
      </main>
    </div>
  );
}
