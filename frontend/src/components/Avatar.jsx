import { useTheme } from "../context/ThemeContext";

export default function Avatar({ foto, nome, size = 52 }) {
  const { avatarBg, avatarBorder } = useTheme();

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
    }}>
      {foto ? (
        <img src={foto} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="rgba(100,140,200,0.3)" strokeWidth="2" />
          <line x1="8" y1="8" x2="40" y2="40" stroke="rgba(100,140,200,0.3)" strokeWidth="2" />
          <circle cx="24" cy="18" r="7" fill="rgba(100,140,200,0.2)" />
          <path d="M10 38 Q24 28 38 38" fill="rgba(100,140,200,0.2)" />
        </svg>
      )}
    </div>
  );
}
