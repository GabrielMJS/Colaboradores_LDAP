import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { UNIDADES } from "../data/mockData";

export default function Header({ search, onSearch, unidade, onUnidade }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  return (
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
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44,
          height: 44,
          background: theme.isDark ? "linear-gradient(135deg, #1a3a7a, #0d2050)" : "linear-gradient(135deg, #1565c0, #0d47a1)",
          borderRadius: 8,
          border: `1px solid ${theme.isDark ? "rgba(100,150,255,0.3)" : "rgba(21,101,192,0.4)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
        }}>
          🛰
        </div>
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: theme.textPrimary,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>AEB</div>
          <div style={{
            fontSize: 10,
            color: theme.logoSub,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}>Agência Espacial Brasileira</div>
        </div>
        <div style={{
          marginLeft: 8,
          paddingLeft: 16,
          borderLeft: `1px solid ${theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,60,160,0.15)"}`,
          fontFamily: "'Barlow Condensed', sans-serif",
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
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>

        {/* Botão Assinaturas */}
        <button
          onClick={() => navigate("/login")}
          style={{
            background: theme.isDark ? "rgba(21,101,192,0.2)" : "rgba(21,101,192,0.1)",
            border: `1px solid ${theme.isDark ? "rgba(100,150,255,0.3)" : "rgba(21,101,192,0.25)"}`,
            borderRadius: 6,
            color: theme.textAccent,
            padding: "7px 14px",
            fontSize: 12,
            fontFamily: "'Barlow Condensed', sans-serif",
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
          onMouseEnter={e => { e.currentTarget.style.background = theme.isDark ? "rgba(21,101,192,0.35)" : "rgba(21,101,192,0.18)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = theme.isDark ? "rgba(21,101,192,0.2)" : "rgba(21,101,192,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          ✍ Assinaturas
        </button>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Pesquisar por nome"
            value={search}
            onChange={e => onSearch(e.target.value)}
            style={{
              background: theme.inputBg,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 6,
              color: theme.inputColor,
              padding: "8px 36px 8px 14px",
              fontSize: 13,
              width: 240,
              outline: "none",
              fontFamily: "'Barlow', sans-serif",
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
          }}>🔍</span>
        </div>

        {/* Dropdown unidade */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              background: theme.inputBg,
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: 6,
              color: unidade === "Selecionar Unidade" ? theme.inputPlaceholder : theme.inputColor,
              padding: "8px 32px 8px 14px",
              fontSize: 13,
              width: 240,
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "'Barlow', sans-serif",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              position: "relative",
            }}
          >
            {unidade}
            <span style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: `translateY(-50%) rotate(${dropdownOpen ? 180 : 0}deg)`,
              transition: "transform 0.2s",
              color: theme.inputPlaceholder,
              fontSize: 10,
            }}>▼</span>
          </button>

          {dropdownOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              width: 340,
              background: theme.dropdownBg,
              border: `1px solid ${theme.dropdownBorder}`,
              borderRadius: 8,
              backdropFilter: "blur(16px)",
              maxHeight: 320,
              overflowY: "auto",
              zIndex: 200,
              animation: "slideDown 0.15s ease",
              boxShadow: "0 16px 48px rgba(0,0,0,0.3)",
            }}>
              {UNIDADES.map(u => (
                <div
                  key={u}
                  onClick={() => { onUnidade(u); setDropdownOpen(false); }}
                  style={{
                    padding: "9px 16px",
                    fontSize: 13,
                    color: u === unidade ? theme.textAccent : theme.textSecondary,
                    cursor: "pointer",
                    fontFamily: "'Barlow', sans-serif",
                    background: u === unidade ? theme.dropdownSelected : "transparent",
                    transition: "background 0.15s",
                    fontStyle: u === "Selecionar Unidade" ? "italic" : "normal",
                  }}
                  onMouseEnter={e => { if (u !== unidade) e.currentTarget.style.background = theme.dropdownHover; }}
                  onMouseLeave={e => { if (u !== unidade) e.currentTarget.style.background = "transparent"; }}
                >
                  {u}
                </div>
              ))}
            </div>
          )}
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
  );
}
