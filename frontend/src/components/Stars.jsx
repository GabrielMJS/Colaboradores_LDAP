import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

export default function Stars() {
  const { isDark } = useTheme();

  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
    duration: Math.random() * 3 + 2,
  })), []);

  if (!isDark) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: "absolute",
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.size,
          height: s.size,
          borderRadius: "50%",
          background: "white",
          opacity: s.opacity,
          animation: `twinkle ${s.duration}s ease-in-out infinite alternate`,
        }} />
      ))}
    </div>
  );
}
