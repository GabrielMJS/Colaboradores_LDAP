import { createContext, useContext, useState } from "react";
import { loginLDAP } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => {
    const saved = localStorage.getItem("aeb_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState("");

  async function login(username, password) {
    try {
      const res = await loginLDAP(username, password);
      if (res.status === "ok") {
        const userData = { ...res.user, token: res.token };
        setUser(userData);
        localStorage.setItem("aeb_user", JSON.stringify(userData));
        setError("");
        return { ok: true, isAdmin: userData.isAdmin, isAniversariantes: userData.isAniversariantes };
      } else {
        setError(res.message || "Usuário ou senha inválidos.");
        return { ok: false };
      }
    } catch (e) {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
      return { ok: false };
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("aeb_user");
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
