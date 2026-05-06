import { createContext, useContext, useState } from "react";
import { loginLDAP } from "../services/api";

const AuthContext = createContext();

// Credenciais fixas do administrador
const ADMIN_USER = "admin.aeb";
const ADMIN_PASS = "AEB@admin2024";

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [error, setError] = useState("");

  async function login(username, password) {
    // Verifica se é o admin fixo
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setUser({ username, displayName: "Administrador AEB", isAdmin: true });
      setError("");
      return { ok: true, isAdmin: true };
    }

    // Login normal via LDAP
    try {
      const res = await loginLDAP(username, password);
      if (res.status === "ok") {
        const isAniv = res.user.username === "aniversariantes.aeb";
        setUser({ ...res.user, isAdmin: false, isAniversariantes: isAniv });
        setError("");
        return { ok: true, isAdmin: false, isAniversariantes: isAniv };
      } else {
        setError(res.message || "Usuário ou senha inválidos.");
        return { ok: false };
      }
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
      return { ok: false };
    }
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
