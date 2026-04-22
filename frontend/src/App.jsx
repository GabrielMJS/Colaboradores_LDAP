import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Assinaturas from "./pages/Assinaturas";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/assinaturas" element={
              <ProtectedRoute>
                <Assinaturas />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedAdminRoute>
                <Admin />
              </ProtectedAdminRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
