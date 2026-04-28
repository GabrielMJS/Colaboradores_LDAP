import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function StarsBg() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.5 + 0.2,
    duration: Math.random() * 3 + 2,
  }));

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

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const { login, error, setError } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleLogin() {
    if (!usuario || !senha) {
      setError("Preencha usuário e senha.");
      return;
    }
    setLoading(true);
    // Simula delay de autenticação LDAP
    await new Promise(r => setTimeout(r, 800));
    const result = await login(usuario, senha);
    setLoading(false);
    if (result.ok) {
      if (result.isAdmin) navigate("/admin");
      else navigate("/assinaturas");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleLogin();
  }

  const inputStyle = {
    width: "100%",
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
    border: `1px solid ${error ? "rgba(239,83,80,0.6)" : isDark ? "rgba(100,150,255,0.2)" : "rgba(0,80,200,0.2)"}`,
    borderRadius: 8,
    color: isDark ? "#e8eef7" : "#0d1f3c",
    padding: "12px 16px",
    fontSize: 14,
    outline: "none",
    fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: isDark
        ? "radial-gradient(ellipse at 30% 40%, #0d1f3c 0%, #050d1a 60%, #020810 100%)"
        : "radial-gradient(ellipse at 30% 40%, #dce8f8 0%, #eef4fc 60%, #f5f8ff 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      transition: "background 0.4s ease",
    }}>
      {isDark && <StarsBg />}

      {/* Nebula glow */}
      {isDark && (
        <>
          <div style={{
            position: "fixed", top: "10%", left: "5%",
            width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(30,80,160,0.1) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }} />
          <div style={{
            position: "fixed", bottom: "10%", right: "5%",
            width: 300, height: 300, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(100,50,180,0.08) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 0,
          }} />
        </>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: "fixed", top: 20, right: 20,
          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,60,160,0.08)",
          border: `1px solid ${isDark ? "rgba(100,150,255,0.2)" : "rgba(0,80,200,0.2)"}`,
          borderRadius: 8, width: 38, height: 38,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 18, zIndex: 10,
          transition: "transform 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        {isDark ? "☀️" : "🌙"}
      </button>

      {/* Card de login */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 420,
        padding: "0 24px",
        animation: "fadeIn 0.4s ease",
      }}>
        <div style={{
          background: isDark ? "rgba(10,20,45,0.85)" : "rgba(255,255,255,0.9)",
          border: `1px solid ${isDark ? "rgba(100,150,255,0.15)" : "rgba(0,80,200,0.12)"}`,
          borderRadius: 16,
          padding: "40px 36px",
          backdropFilter: "blur(16px)",
          boxShadow: isDark
            ? "0 32px 80px rgba(0,0,0,0.6)"
            : "0 32px 80px rgba(0,80,200,0.1)",
        }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64,
              background: isDark
                ? "linear-gradient(135deg, #1a3a7a, #0d2050)"
                : "linear-gradient(135deg, #1565c0, #0d47a1)",
              borderRadius: 14,
              border: `1px solid ${isDark ? "rgba(100,150,255,0.3)" : "rgba(21,101,192,0.4)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, margin: "0 auto 16px",
              boxShadow: isDark ? "0 8px 24px rgba(0,30,100,0.5)" : "0 8px 24px rgba(21,101,192,0.2)",
            }}>
              🛰
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700, fontSize: 24,
              color: isDark ? "#e8eef7" : "#0d1f3c",
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>
              AEB
            </div>
            <div style={{
              fontSize: 11,
              color: isDark ? "rgba(180,200,235,0.5)" : "rgba(0,60,160,0.4)",
              letterSpacing: "0.15em", textTransform: "uppercase",
              marginBottom: 4,
            }}>
              Agência Espacial Brasileira
            </div>
            <div style={{
              fontSize: 13,
              color: isDark ? "rgba(150,190,255,0.6)" : "rgba(0,80,200,0.5)",
              fontFamily: "'Inter', sans-serif",
            }}>
              Sistema de Assinaturas
            </div>
          </div>

          {/* Campos */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", marginBottom: 6,
              fontSize: 11, fontFamily: "'Inter', sans-serif",
              fontWeight: 600, letterSpacing: "0.1em",
              color: isDark ? "rgba(150,190,255,0.5)" : "rgba(0,60,160,0.45)",
              textTransform: "uppercase",
            }}>
              Usuário de rede
            </label>
            <input
              type="text"
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="nome.sobrenome"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = isDark ? "rgba(100,150,255,0.5)" : "rgba(0,80,200,0.5)"}
              onBlur={e => e.target.style.borderColor = error ? "rgba(239,83,80,0.6)" : isDark ? "rgba(100,150,255,0.2)" : "rgba(0,80,200,0.2)"}
            />
          </div>

          <div style={{ marginBottom: 24, position: "relative" }}>
            <label style={{
              display: "block", marginBottom: 6,
              fontSize: 11, fontFamily: "'Inter', sans-serif",
              fontWeight: 600, letterSpacing: "0.1em",
              color: isDark ? "rgba(150,190,255,0.5)" : "rgba(0,60,160,0.45)",
              textTransform: "uppercase",
            }}>
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showSenha ? "text" : "password"}
                value={senha}
                onChange={e => { setSenha(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = isDark ? "rgba(100,150,255,0.5)" : "rgba(0,80,200,0.5)"}
                onBlur={e => e.target.style.borderColor = error ? "rgba(239,83,80,0.6)" : isDark ? "rgba(100,150,255,0.2)" : "rgba(0,80,200,0.2)"}
              />
              <button
                onClick={() => setShowSenha(s => !s)}
                style={{
                  position: "absolute", right: 12, top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent", border: "none",
                  cursor: "pointer", fontSize: 16,
                  color: isDark ? "rgba(150,180,220,0.5)" : "rgba(0,60,160,0.35)",
                  padding: 0,
                }}
              >
                {showSenha ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div style={{
              background: "rgba(239,83,80,0.1)",
              border: "1px solid rgba(239,83,80,0.3)",
              borderRadius: 6, padding: "8px 12px",
              marginBottom: 16,
              fontSize: 13, color: "#ef5350",
              fontFamily: "'Inter', sans-serif",
              animation: "fadeIn 0.2s ease",
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Botão entrar */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              background: loading
                ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")
                : "linear-gradient(135deg, #1565c0, #0d47a1)",
              border: "none", borderRadius: 8,
              color: loading ? (isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#fff",
              padding: "13px",
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s, transform 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            {loading ? (
              <>
                <span style={{
                  width: 14, height: 14,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }} />
                Autenticando...
              </>
            ) : "Entrar"}
          </button>

          {/* Rodapé */}
          <div style={{
            marginTop: 24, textAlign: "center",
            fontSize: 11,
            color: isDark ? "rgba(150,180,220,0.3)" : "rgba(0,60,160,0.25)",
            fontFamily: "'Inter', sans-serif",
          }}>
            Use suas credenciais de rede da AEB
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes twinkle { from { opacity: 0.2; } to { opacity: 0.8; } }
      `}</style>
    </div>
  );
}
