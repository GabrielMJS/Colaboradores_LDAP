import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Home from "./pages/Home";
import Assinaturas from "./pages/Assinaturas";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assinaturas" element={<Assinaturas />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
