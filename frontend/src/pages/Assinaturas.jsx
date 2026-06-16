import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { fetchCapas, fetchColaboradores, uploadUserPhoto, deleteUserPhoto } from "../services/api";
import { drawSignature } from "../utils/signatureUtils";

// Removidas as larguras hardcoded para podermos usar o tamanho real da imagem

export default function Assinaturas() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const canvasRef = useRef(null);

  const [capaId, setCapaId] = useState("");
  const [capas, setCapas] = useState([]);
  const [ramal, setRamal] = useState("");
  const [email, setEmail] = useState("");
  const [preview, setPreview] = useState(null);
  const [capaDropdownOpen, setCapaDropdownOpen] = useState(false);

  // Estados para gerenciamento de foto e editor
  const [userFoto, setUserFoto] = useState(null); // URL ou base64 atual da foto do usuário
  const [fotoOriginal, setFotoOriginal] = useState(null); // Foto vinda do LDAP original para fallback se houver
  const [pendingFoto, setPendingFoto] = useState(null); // Foto editada pendente de salvar (Base64 cropped)
  const [markedForDelete, setMarkedForDelete] = useState(false); // Flag de exclusão pendente
  const [savingFoto, setSavingFoto] = useState(false); // Feedback de salvamento
  const [feedbackMsg, setFeedbackMsg] = useState(""); // Mensagem de sucesso/erro

  // Estados do Micro-Editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null); // Fonte da imagem selecionada no input para editar
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Coordenadas internas da imagem no cropper
  const [imgDims, setImgDims] = useState({ baseWidth: 0, baseHeight: 0 });
  const [imgPos, setImgPos] = useState({ left: 0, top: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const cropperRef = useRef(null);
  const fileInputRef = useRef(null);
  const cropSize = 250; // Tamanho do spotlight de corte

  // Detecção de coluna responsiva
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 850);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Deriva o colaborador logado
  const colaborador = user ? {
    nome: user.displayName || user.username || "Usuário não identificado",
    cargo: user.title || "Cargo não informado",
    divisao_nome: user.divisao_nome || "",
    coordenacao_nome: user.coordenacao_nome || "",
    diretoria_nome: user.diretoria_nome || "",
    email: user.email || "",
    ramal: user.ramal || "",
  } : null;

  // Ao montar, preenche o e-mail, busca capas e a foto do colaborador atual
  useEffect(() => {
    if (colaborador) {
      setEmail(colaborador.email);
      if (colaborador.ramal) setRamal(colaborador.ramal);
    }
    fetchCapas().then(setCapas).catch(() => setCapas([]));

    if (user?.username) {
      fetchColaboradores()
        .then(dados => {
          const matching = dados.find(c => c.sAMAccountName === user.username);
          if (matching) {
            setUserFoto(matching.foto || null);
            setFotoOriginal(matching.foto || null);
          }
        })
        .catch(err => console.error("Erro ao carregar dados de foto do colaborador:", err));
    }
  }, [user]);

  // Handlers para o Micro-Editor de Fotos
  const handleImageLoad = (e) => {
    const img = e.target;
    const nWidth = img.naturalWidth;
    const nHeight = img.naturalHeight;
    setNaturalSize({ width: nWidth, height: nHeight });

    let bWidth = cropSize;
    let bHeight = cropSize;

    if (nWidth / nHeight > 1) {
      // Imagem paisagem
      bHeight = cropSize;
      bWidth = cropSize * (nWidth / nHeight);
    } else {
      // Imagem retrato
      bWidth = cropSize;
      bHeight = cropSize * (nHeight / nWidth);
    }

    setImgDims({ baseWidth: bWidth, baseHeight: bHeight });
    setZoom(1);
    setImgPos({
      left: (cropSize - bWidth) / 2,
      top: (cropSize - bHeight) / 2
    });
  };

  const handleStartDrag = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({
      x: clientX - imgPos.left,
      y: clientY - imgPos.top
    });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let newLeft = clientX - dragStart.x;
    let newTop = clientY - dragStart.y;

    const currentW = imgDims.baseWidth * zoom;
    const currentH = imgDims.baseHeight * zoom;
    
    // Garantir enquadramento (pelo menos 50px de imagem na área visível)
    const minLeft = 50 - currentW;
    const maxLeft = cropSize - 50;
    const minTop = 50 - currentH;
    const maxTop = cropSize - 50;

    newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
    newTop = Math.max(minTop, Math.min(maxTop, newTop));

    setImgPos({ left: newLeft, top: newTop });
  };

  const handleStopDrag = () => {
    setIsDragging(false);
  };

  // Zoom centralizado no spotlight de corte
  const handleZoomChange = (newZoom) => {
    const centerX = cropSize / 2;
    const centerY = cropSize / 2;

    const imageX = (centerX - imgPos.left) / zoom;
    const imageY = (centerY - imgPos.top) / zoom;

    setZoom(newZoom);
    setImgPos({
      left: centerX - imageX * newZoom,
      top: centerY - imageY * newZoom
    });
  };

  // Processamento do corte no canvas nativo
  const handleApplyCrop = () => {
    if (!imageSrc) return;

    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");

    const currentWidth = imgDims.baseWidth * zoom;
    const currentHeight = imgDims.baseHeight * zoom;

    const scaleX = naturalSize.width / currentWidth;
    const scaleY = naturalSize.height / currentHeight;

    const sourceX = -imgPos.left * scaleX;
    const sourceY = -imgPos.top * scaleY;
    const sourceWidth = cropSize * scaleX;
    const sourceHeight = cropSize * scaleY;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, 400, 400
      );

      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setPendingFoto(croppedDataUrl);
      setMarkedForDelete(false);
      setEditorOpen(false);
      setImageSrc(null);
    };
  };

  // Envio / Exclusão das imagens no servidor
  const handleSaveFoto = async () => {
    if (!user?.username) return;
    setSavingFoto(true);
    setFeedbackMsg("");

    try {
      if (markedForDelete) {
        await deleteUserPhoto(user.username);
        setUserFoto(null);
        setMarkedForDelete(false);
        setFeedbackMsg("✓ Foto excluída com sucesso!");
      } else if (pendingFoto) {
        const response = await fetch(pendingFoto);
        const blob = await response.blob();
        const file = new File([blob], `${user.username}.jpg`, { type: "image/jpeg" });
        
        const res = await uploadUserPhoto(user.username, file);
        if (res.status === "ok") {
          setUserFoto(`${res.foto_url}?t=${Date.now()}`);
          setPendingFoto(null);
          setFeedbackMsg("✓ Foto atualizada com sucesso!");
        } else {
          throw new Error(res.message);
        }
      }
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (error) {
      console.error("Erro ao salvar foto de perfil:", error);
      setFeedbackMsg(`⚠ ${error.message || "Erro ao atualizar a foto."}`);
    } finally {
      setSavingFoto(false);
    }
  };

  const capa = capas.find(c => c.id === Number(capaId));

  async function gerarAssinatura() {
    if (!colaborador || !capa) return;
    
    // Atualiza o colaborador.ramal com o que está no input antes de gerar
    const colabDados = { ...colaborador, ramal: ramal };

    const dataUrl = await drawSignature(canvasRef.current, colabDados, capa.arquivo);
    if (dataUrl) setPreview(dataUrl);
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
    fontFamily: "'Inter', sans-serif",
  };

  const labelStyle = {
    fontSize: 11,
    fontFamily: "'Inter', sans-serif",
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
      fontFamily: "'Inter', sans-serif",
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
              fontFamily: "'Inter', sans-serif",
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
            display: "flex",
            alignItems: "center",
          }}>
            <img 
              src={theme.isDark ? "/Images/logoBranca.png" : "/Images/logoAzul.png"} 
              alt="Logo AEB" 
              style={{ height: 44, width: "auto", objectFit: "contain", marginRight: 12 }}
            />
            <span style={{
              fontFamily: "'Inter', sans-serif",
              paddingLeft: 12,
              borderLeft: `1px solid ${theme.rowBorder}`,
              fontWeight: 600,
              fontSize: 16,
              color: theme.textAccent,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
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

      <main style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Grid Responsivo para Formulário + Preview (Esquerda) e Painel de Fotos (Direita) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "3fr 1fr",
          gap: 28,
          alignItems: "stretch",
          marginBottom: 28,
        }}>

            {/* Formulário de Assinatura */}
            <div style={{
              background: theme.tableBg,
              border: theme.tableBorder,
              borderRadius: 12,
              padding: "28px",
              backdropFilter: "blur(8px)",
              transition: "background 0.4s ease, border 0.4s ease",
            }}>
              <h2 style={{
                fontFamily: "'Inter', sans-serif",
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
                        fontFamily: "'Inter', sans-serif",
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
                            fontFamily: "'Inter', sans-serif",
                            background: !capaId ? theme.dropdownSelected : "transparent",
                            transition: "background 0.15s",
                            fontStyle: "italic",
                          }}
                          onMouseEnter={e => { if (capaId) e.currentTarget.style.background = theme.dropdownHover; }}
                          onMouseLeave={e => { if (capaId) e.currentTarget.style.background = "transparent"; }}
                        >
                          Selecionar capa...
                        </div>
                        {capas.map(c => (
                          <div
                            key={c.id}
                            onClick={() => { setCapaId(c.id); setCapaDropdownOpen(false); }}
                            style={{
                              padding: "9px 16px",
                              fontSize: 13,
                              color: c.id === Number(capaId) ? theme.textAccent : theme.textSecondary,
                              cursor: "pointer",
                              fontFamily: "'Inter', sans-serif",
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
                  <p style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'Inter', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                    Dados puxados automaticamente
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 40px" }}>
                    {[
                      { label: "Nome", value: colaborador.nome },
                      { label: "Cargo", value: colaborador.cargo },
                      { label: "Divisão", value: colaborador.divisao_nome },
                      { label: "Coordenação", value: colaborador.coordenacao_nome },
                      { label: "Diretoria", value: colaborador.diretoria_nome },
                    ].filter(f => f.value).map(f => (
                      <div key={f.label}>
                        <span style={{ ...labelStyle, marginBottom: 4 }}>{f.label}</span>
                        <div style={{
                          fontSize: 13,
                          color: theme.textPrimary,
                          fontFamily: "'Inter', sans-serif",
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
                  fontFamily: "'Inter', sans-serif",
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

          {/* Coluna da Direita: Painel de Foto de Perfil */}
          <div style={{
            background: theme.tableBg,
            border: theme.tableBorder,
            borderRadius: 12,
            padding: "28px",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
            transition: "background 0.4s ease, border 0.4s ease",
          }}>
            <h2 style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: theme.textAccent,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              alignSelf: "flex-start",
              marginBottom: 24,
            }}>
              Foto de Perfil
            </h2>

            {/* Preview da foto */}
            <div style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: `3px solid ${theme.inputBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
              position: "relative",
              marginBottom: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              transition: "border-color 0.4s ease"
            }}>
              {markedForDelete ? (
                <div style={{ color: "#ef5350", fontSize: 12, textAlign: "center", padding: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
                  🗑️<br/>Foto marcada para exclusão
                </div>
              ) : pendingFoto ? (
                <img src={pendingFoto} alt="Preview do corte" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : userFoto ? (
                <img src={userFoto} alt="Foto de perfil atual" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: theme.textAccent,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "-0.02em"
                }}>
                  {colaborador?.nome ? colaborador.nome.split(" ").slice(0, 2).map(n => n[0].toUpperCase()).join("") : "U"}
                </div>
              )}
            </div>

            {/* Mensagem de Feedback temporária */}
            {feedbackMsg && (
              <div style={{
                fontSize: 12,
                color: feedbackMsg.startsWith("✓") ? "#4caf50" : "#f44336",
                marginBottom: 16,
                textAlign: "center",
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif"
              }}>
                {feedbackMsg}
              </div>
            )}

            {/* Ações da foto */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
              
              <button
                onClick={() => fileInputRef.current.click()}
                disabled={savingFoto}
                style={{
                  background: theme.inputBg,
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 8,
                  color: theme.textPrimary,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                  transition: "background 0.2s, color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "'Inter', sans-serif"
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.rowHover}
                onMouseLeave={e => e.currentTarget.style.background = theme.inputBg}
              >
                {userFoto || pendingFoto ? "🔄 Alterar Foto" : "⬆ Enviar Foto"}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setImageSrc(event.target.result);
                      setEditorOpen(true);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = null; // Reseta input para permitir selecionar a mesma foto
                  }
                }}
              />

              {/* Botão de Excluir Foto */}
              {(userFoto || pendingFoto) && !markedForDelete && (
                <button
                  onClick={() => {
                    if (window.confirm("Deseja marcar sua foto para exclusão?")) {
                      if (pendingFoto) {
                        setPendingFoto(null);
                        setMarkedForDelete(false);
                      } else {
                        setMarkedForDelete(true);
                      }
                    }
                  }}
                  disabled={savingFoto}
                  style={{
                    background: theme.isDark ? "rgba(239, 83, 80, 0.05)" : "rgba(239, 83, 80, 0.03)",
                    border: `1px solid rgba(239, 83, 80, 0.4)`,
                    borderRadius: 8,
                    color: "#ef5350",
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                    transition: "background 0.2s, border-color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontFamily: "'Inter', sans-serif"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(239, 83, 80, 0.15)";
                    e.currentTarget.style.borderColor = "#ef5350";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = theme.isDark ? "rgba(239, 83, 80, 0.05)" : "rgba(239, 83, 80, 0.03)";
                    e.currentTarget.style.borderColor = "rgba(239, 83, 80, 0.4)";
                  }}
                >
                  🗑️ Excluir Foto
                </button>
              )}

              {/* Cancelar Exclusão */}
              {markedForDelete && (
                <button
                  onClick={() => setMarkedForDelete(false)}
                  disabled={savingFoto}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: theme.textSecondary,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  ↩ Cancelar Exclusão
                </button>
              )}

              {/* Botão de Salvar Pendente */}
              {(pendingFoto !== null || markedForDelete) && (
                <button
                  onClick={handleSaveFoto}
                  disabled={savingFoto}
                  style={{
                    background: "linear-gradient(135deg, #1565c0, #0d47a1)",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "12px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: savingFoto ? "not-allowed" : "pointer",
                    width: "100%",
                    boxShadow: "0 4px 12px rgba(21, 101, 192, 0.3)",
                    transition: "opacity 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 8,
                    fontFamily: "'Inter', sans-serif"
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  {savingFoto ? (
                    <>
                      <span className="spinner" style={{
                        width: 14, height: 14,
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite"
                      }} />
                      Salvando...
                    </>
                  ) : "💾 Salvar Alteração"}
                </button>
              )}

            </div>
          </div>

        </div>

        {/* Preview da Assinatura */}
        {preview && (
          <div style={{
            background: theme.tableBg,
            border: theme.tableBorder,
            borderRadius: 12,
            padding: "28px",
            backdropFilter: "blur(8px)",
            animation: "fadeIn 0.3s ease",
            transition: "background 0.4s ease, border 0.4s ease",
          }}>
            <h2 style={{
              fontFamily: "'Inter', sans-serif",
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
                fontFamily: "'Inter', sans-serif",
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

      {/* Modal do Micro-Editor de Foto */}
      {editorOpen && imageSrc && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          animation: "fadeIn 0.2s ease",
          padding: 16
        }}>
          <div style={{
            background: theme.tableBg,
            border: theme.tableBorder,
            borderRadius: 16,
            width: "100%",
            maxWidth: 380,
            padding: "24px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transition: "background 0.4s ease, border 0.4s ease",
          }}>
            <h3 style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: theme.textAccent,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 16,
              alignSelf: "flex-start"
            }}>
              Ajustar Foto do Perfil
            </h3>

            {/* Container do Cropper */}
            <div style={{
              width: cropSize + 40,
              height: cropSize + 40,
              background: "#080f1e",
              borderRadius: 12,
              border: `1px solid ${theme.inputBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
              marginBottom: 20,
              userSelect: "none"
            }}>
              
              {/* Frame de Recorte Interno (250x250) */}
              <div 
                ref={cropperRef}
                style={{
                  width: cropSize,
                  height: cropSize,
                  position: "relative",
                  overflow: "hidden",
                  cursor: isDragging ? "grabbing" : "grab"
                }}
              >
                {/* Imagem a ser cortada */}
                <img
                  src={imageSrc}
                  alt="Ajuste"
                  onLoad={handleImageLoad}
                  style={{
                    position: "absolute",
                    width: imgDims.baseWidth * zoom,
                    height: imgDims.baseHeight * zoom,
                    left: imgPos.left,
                    top: imgPos.top,
                    pointerEvents: "none",
                    maxWidth: "none",
                    maxHeight: "none"
                  }}
                />

                {/* Máscara Spotlight Circular com Box-Shadow Infinito */}
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  borderRadius: "50%",
                  border: "2px dashed rgba(255, 255, 255, 0.7)",
                  boxShadow: "0 0 0 9999px rgba(8, 15, 30, 0.75)",
                  pointerEvents: "none"
                }} />

                {/* Camada interativa para capturar gestos/arraste */}
                <div
                  onMouseDown={handleStartDrag}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleStopDrag}
                  onMouseLeave={handleStopDrag}
                  onTouchStart={handleStartDrag}
                  onTouchMove={handleDragMove}
                  onTouchEnd={handleStopDrag}
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 10,
                  }}
                />
              </div>

            </div>

            {/* Controle de Zoom Slider */}
            <div style={{ width: "100%", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Inter', sans-serif" }}>
                  Zoom
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: theme.textAccent, fontFamily: "'Inter', sans-serif" }}>
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => handleZoomChange(Math.max(1, zoom - 0.1))}
                  style={{
                    width: 28, height: 28,
                    borderRadius: "50%",
                    border: `1px solid ${theme.inputBorder}`,
                    background: theme.inputBg,
                    color: theme.textPrimary,
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14,
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  −
                </button>
                
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: theme.textAccent,
                    cursor: "pointer",
                    height: 6,
                    borderRadius: 3,
                    background: theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
                  }}
                />
                
                <button
                  onClick={() => handleZoomChange(Math.min(3, zoom + 0.1))}
                  style={{
                    width: 28, height: 28,
                    borderRadius: "50%",
                    border: `1px solid ${theme.inputBorder}`,
                    background: theme.inputBg,
                    color: theme.textPrimary,
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14,
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Ações do Modal */}
            <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 12 }}>
              <button
                onClick={() => {
                  setEditorOpen(false);
                  setImageSrc(null);
                }}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 8,
                  color: theme.textSecondary,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s",
                  fontFamily: "'Inter', sans-serif"
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.rowHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                Cancelar
              </button>

              <button
                onClick={handleApplyCrop}
                style={{
                  flex: 1,
                  background: "linear-gradient(135deg, #2e7d32, #1b5e20)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(46, 125, 50, 0.25)",
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                Aplicar
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
