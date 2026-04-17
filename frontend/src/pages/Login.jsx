import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Stars from "../components/Stars";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const theme = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!username || !password) {
      setError("Preencha usuário e senha.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        login(data.user);
        navigate("/assinaturas");
      } else {
        setError(data.message || "Usuário ou senha inválidos.");
      }
    } catch {
      setError("Erro ao conectar com o servidor. Verifique se o backend está rodando.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.pageBg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <Stars />

      {theme.isDark && (
        <div style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(21,101,192,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />
      )}

      <div style={{
        position: "relative",
        zIndex: 1,
        background: theme.tableBg,
        border: theme.tableBorder,
        borderRadius: 16,
        backdropFilter: "blur(12px)",
        padding: "48px 40px",
        width: "100%",
        maxWidth: 400,
        boxShadow: theme.isDark
          ? "0 24px 80px rgba(0,0,0,0.5)"
          : "0 24px 80px rgba(0,60,160,0.12)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            background: theme.isDark
              ? "linear-gradient(135deg, #1a3a7a, #0d2050)"
              : "linear-gradient(135deg, #1565c0, #0d47a1)",
            borderRadius: 12,
            border: `1px solid ${theme.isDark ? "rgba(100,150,255,0.3)" : "rgba(21,101,192,0.4)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            margin: "0 auto 16px",
          }}>🛰</div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: theme.textPrimary,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>AEB Colaboradores</div>
          <div style={{
            fontSize: 12,
            color: theme.textMuted,
            marginTop: 4,
            fontFamily: "'Barlow', sans-serif",
            letterSpacing: "0.05em",
          }}>Acesse com suas credenciais de rede</div>
        </div>

        {/* Campos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{
              display: "block",
              fontSize: 11,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: theme.textMuted,
              marginBottom: 6,
            }}>Usuário de rede</label>
            <input
              type="text"
              placeholder="Ex: gabriel.silva"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="username"
              style={{
                width: "100%",
                background: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 8,
                color: theme.inputColor,
                padding: "10px 14px",
                fontSize: 14,
                outline: "none",
                fontFamily: "'Barlow', sans-serif",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = theme.inputBorderFocus}
              onBlur={e => e.target.style.borderColor = theme.inputBorder}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: 11,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: theme.textMuted,
              marginBottom: 6,
            }}>Senha</label>
            <input
              type="password"
              placeholder="Sua senha de rede"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
              style={{
                width: "100%",
                background: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 8,
                color: theme.inputColor,
                padding: "10px 14px",
                fontSize: 14,
                outline: "none",
                fontFamily: "'Barlow', sans-serif",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = theme.inputBorderFocus}
              onBlur={e => e.target.style.borderColor = theme.inputBorder}
            />
          </div>

          {error && (
            <div style={{
              background: theme.isDark ? "rgba(220,50,50,0.12)" : "rgba(220,50,50,0.08)",
              border: "1px solid rgba(220,50,50,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: theme.isDark ? "#ff7070" : "#c62828",
              fontFamily: "'Barlow', sans-serif",
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading
                ? (theme.isDark ? "rgba(21,101,192,0.3)" : "rgba(21,101,192,0.4)")
                : "linear-gradient(135deg, #1565c0, #0d47a1)",
              border: "none",
              borderRadius: 8,
              color: "white",
              padding: "12px",
              fontSize: 14,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
              transition: "opacity 0.2s, transform 0.15s",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            {loading ? "Autenticando..." : "Entrar"}
          </button>

          <button
            onClick={() => navigate("/")}
            style={{
              background: "transparent",
              border: "none",
              color: theme.textMuted,
              fontSize: 12,
              fontFamily: "'Barlow', sans-serif",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            ← Voltar para colaboradores
          </button>
        </div>
      </div>
    </div>
  );
}
