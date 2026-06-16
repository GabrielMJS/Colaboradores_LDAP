import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import DropdownHierarquico from "./DropdownHierarquico";

export default function Header({ search, onSearch, unidade, onUnidade, departamentos = [], onLogoClick }) {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <>
      <header style={{
        background: theme.headerBg,
        borderBottom: "none",
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

        {/* Bandeirinhas SVG */}
        <img
          src="/Images/bandeirinhas-juninas.svg"
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "65%",
            height: 90,
            objectFit: "contain",
            opacity: 0.9,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Logo */}
        <div
          onClick={onLogoClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: onLogoClick ? "pointer" : "default",
            transition: "transform 0.2s, opacity 0.2s",
            position: "relative",
            zIndex: 10,
          }}
          onMouseEnter={e => {
            if (onLogoClick) {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.opacity = "0.9";
            }
          }}
          onMouseLeave={e => {
            if (onLogoClick) {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.opacity = "1";
            }
          }}
        >
          <img
            src={theme.isDark ? "/Images/logoBranca.png" : "/Images/logoAzul.png"}
            alt="Logo AEB"
            style={{ height: 52, width: "auto", objectFit: "contain" }}
          />
          <div style={{
            marginLeft: 8,
            paddingLeft: 16,
            borderLeft: `1px solid ${theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,60,160,0.15)"}`,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 16,
            color: theme.textAccent,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            Colaboradores
          </div>
        </div>

        {/* Right side */}
        <div style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}>

          {/* Botão Assinaturas */}
          <button
            onClick={() => navigate("/login")}
            style={{
              background: theme.isDark ? "#0B234A" : "#FFFFFF",
              border: `1px solid ${theme.isDark ? "rgba(100,150,255,0.3)" : "rgba(21,101,192,0.25)"}`,
              borderRadius: 6,
              color: theme.textAccent,
              padding: "7px 14px",
              fontSize: 12,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "background 0.2s, transform 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = theme.isDark ? "#103266" : "#EAF2FF"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = theme.isDark ? "#0B234A" : "#FFFFFF"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            ✍ Assinaturas
          </button>

          {/* Dropdown unidade */}
          <div style={{ width: 240, zIndex: 200 }}>
            <DropdownHierarquico
              value={unidade}
              onChange={onUnidade}
              theme={theme}
              departamentos={departamentos}
              placeholder="Selecionar Unidade"
            />
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Pesquisar por nome"
              value={search}
              onChange={e => onSearch(e.target.value)}
              style={{
                background: theme.isDark ? "#0B234A" : "#FFFFFF",
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 6,
                color: theme.inputColor,
                padding: "8px 36px 8px 14px",
                fontSize: 13,
                width: 240,
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = theme.inputBorderFocus}
              onBlur={e => e.target.style.borderColor = theme.inputBorder}
            />
            <span style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: theme.inputPlaceholder,
              fontSize: 14,
              pointerEvents: "none",
              zIndex: 10,
            }}>🔍</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={theme.toggleTheme}
            title={theme.isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
            style={{
              background: theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,60,160,0.08)",
              border: `1px solid ${theme.isDark ? "rgba(100,150,255,0.2)" : "rgba(0,80,200,0.2)"}`,
              borderRadius: 8,
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
              transition: "background 0.2s, transform 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {theme.isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* ── Faixa Festa Junina ── */}
      <div style={{
        position: "sticky",
        top: 64,
        zIndex: 99,
        width: "100%",
        height: 130,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.isDark ? "#07142D" : theme.headerBg,
        borderBottom: "1px solid rgba(255,180,0,0.18)",
        boxShadow: "none",
      }}>
        {/* Cosminho e Luana Juninos */}
        <img
          src="/Images/cosminho-copa.png"
          alt="Cosminho"
          style={{
            position: "absolute",
            left: 800,
            bottom: -2,
            height: 120,
            width: "auto",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        <img
          src="/Images/luana-copa.png"
          alt="Luana"
          style={{
            position: "absolute",
            right: 800,
            bottom: -2,
            height: 120,
            width: "auto",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />

        {/* Fogueira animada */}
        <img
          src="/Images/fogueira.gif"
          alt="Fogueira"
          style={{
            position: "absolute",
            left: "50%",
            bottom: 5,
            transform: "translateX(-50%)",
            width: 90,
            height: "auto",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      </div>
    </>
  );
}
