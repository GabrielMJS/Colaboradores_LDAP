import { useState } from "react";
import Avatar from "./Avatar";
import { useTheme } from "../context/ThemeContext";

export default function ColaboradorRow({ colaborador }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const cargoColor = theme.isDark ? "#90caf9" : "#1565c0";

  return (
    <div style={{ borderBottom: theme.rowBorder, transition: "background 0.2s" }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 100px 1fr 90px 220px 180px",
          alignItems: "center",
          gap: 16,
          padding: "14px 24px",
          cursor: "pointer",
          background: expanded ? theme.rowExpanded : "transparent",
          transition: "background 0.2s",
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = theme.rowHover; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
      >
        {/* Foto */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Avatar foto={colaborador.foto} nome={colaborador.nome} />
        </div>

        {/* Nome */}
        <div style={{
          color: theme.textPrimary,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          {colaborador.nome}
          <span style={{ color: theme.textMuted, fontSize: 10 }}>▼</span>
        </div>

        {/* Unidade */}
        <div style={{
          color: theme.textAccent,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          fontSize: 13,
          letterSpacing: "0.05em",
          textAlign: "center",
        }}>
          {colaborador.unidade}
        </div>

        {/* Lotação */}
        <div style={{
          color: theme.textSecondary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
        }}>
          {colaborador.lotacao}
        </div>

        {/* Ramal */}
        <div style={{
          color: theme.textSecondary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 14,
          textAlign: "center",
        }}>
          {colaborador.ramal}
        </div>

        {/* Email */}
        <div style={{
          color: theme.textLink,
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {colaborador.email}
        </div>

        {/* Cargo */}
        <div style={{
          color: cargoColor,
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 500,
        }}>
          {colaborador.cargo}
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div style={{
          display: "flex",
          gap: 10,
          padding: "10px 24px 18px 120px",
          flexWrap: "wrap",
          animation: "fadeIn 0.2s ease",
        }}>
          {[
            { label: "Mensagem no Teams", icon: "💬", color: "#5264ae" },
            { label: "E-mail no Outlook", icon: "✉️", color: "#0078d4" },
            { label: "Copiar e-mail", icon: "📋", color: theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,60,160,0.12)" },
            { label: "Chamada de vídeo", icon: "📹", color: "#2d7d46" },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={(e) => {
                e.stopPropagation();
                if (btn.label === "Copiar e-mail") {
                  navigator.clipboard.writeText(colaborador.email);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } else if (btn.label === "Mensagem no Teams") {
                  window.open(`https://teams.microsoft.com/l/chat/0/0?users=${colaborador.email}`, "_blank");
                } else if (btn.label === "E-mail no Outlook") {
                  window.open(`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(colaborador.email)}`, "_blank");
                } else if (btn.label === "Chamada de vídeo") {
                  window.open(`https://teams.microsoft.com/l/call/0/0?users=${colaborador.email}`, "_blank");
                }
              }}
              style={{
                background: btn.color,
                border: `1px solid ${theme.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,60,160,0.15)"}`,
                borderRadius: 6,
                color: theme.isDark ? "white" : btn.color === theme.isDark ? "white" : "#fff",
                padding: "6px 14px",
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "opacity 0.15s, transform 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <span>{btn.icon}</span> {btn.label === "Copiar e-mail" && copied ? "Copiado!" : btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
