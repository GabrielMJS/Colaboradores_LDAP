import { useTheme } from "../context/ThemeContext";

export default function Avatar({ foto, nome, size = 52 }) {
  const theme = useTheme();
  const { avatarBg, avatarBorder } = theme;

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/[\s.]+/);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      border: `2px solid ${avatarBorder}`,
      background: avatarBg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      userSelect: "none",
    }}>
      {foto ? (
        <img src={foto} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{
          fontSize: size * 0.4,
          fontWeight: 600,
          color: theme.isDark ? "#90caf9" : "#1565c0",
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.02em",
        }}>
          {getInitials(nome)}
        </span>
      )}
    </div>
  );
}
