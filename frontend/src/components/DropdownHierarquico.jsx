import React, { useState, useEffect, useMemo, useRef } from "react";

function inputStyle(theme) {
  return {
    background: theme.inputBg, border: `1px solid ${theme.inputBorder}`,
    borderRadius: 6, color: theme.inputColor, padding: "8px 12px",
    fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif", width: "100%",
  };
}

export default function DropdownHierarquico({ value, onChange, theme, departamentos, placeholder = "Selecione uma lotação..." }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tree = useMemo(() => {
    const map = {};
    departamentos.forEach(d => {
      map[d.sigla] = { ...d, children: [] };
    });
    const roots = [];
    departamentos.forEach(d => {
      if (d.diretoria_pai && map[d.diretoria_pai] && d.diretoria_pai !== d.sigla) {
        map[d.diretoria_pai].children.push(map[d.sigla]);
      } else {
        roots.push(map[d.sigla]);
      }
    });
    const flat = [];
    function flatten(nodes, level) {
      nodes.forEach(n => {
        flat.push({ ...n, level });
        flatten(n.children, level + 1);
      });
    }
    flatten(roots, 0);
    return flat;
  }, [departamentos]);

  const filtrados = useMemo(() => {
    if (!busca) return tree;
    const q = busca.toLowerCase();
    return tree.filter(n => 
      n.sigla.toLowerCase().includes(q) || 
      (n.nome_oficial || "").toLowerCase().includes(q)
    );
  }, [tree, busca]);

  const selectedNode = tree.find(n => n.sigla === value);
  const displayValue = selectedNode ? `${selectedNode.sigla} - ${selectedNode.nome_oficial}` : placeholder;

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{
          ...inputStyle(theme), cursor: "pointer", 
          display: "flex", justifyContent: "space-between", alignItems: "center",
          height: 38, boxSizing: "border-box",
          color: value ? theme.inputColor : theme.inputPlaceholder || theme.textMuted
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayValue}
        </span>
        <span style={{ fontSize: 10, color: theme.textMuted }}>▼</span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4,
          minWidth: "100%", width: "max-content", maxWidth: "450px",
          background: theme.dropdownBg || theme.tableBg, border: `1px solid ${theme.dropdownBorder || theme.inputBorder}`,
          borderRadius: 8, maxHeight: 300, overflowY: "auto", zIndex: 1000,
          boxShadow: theme.isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.15)"
        }}>
          <div style={{ padding: 8, position: "sticky", top: 0, background: theme.dropdownBg || theme.tableBg, zIndex: 2 }}>
            <input 
              type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar sigla ou nome..." autoFocus
              style={{ ...inputStyle(theme), width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ paddingBottom: 8 }}>
            {/* Opção para limpar a seleção se for do tipo 'Selecionar Unidade' ou 'Todas as unidades' */}
            {placeholder !== "Selecione uma lotação..." && !busca && (
              <div 
                onClick={() => { onChange(""); setOpen(false); setBusca(""); }}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer", fontSize: 13, fontFamily: "'Inter', sans-serif",
                  color: !value ? theme.textAccent : theme.textPrimary,
                  background: !value ? (theme.dropdownSelected || "rgba(21,101,192,0.1)") : "transparent",
                  display: "flex", alignItems: "center", gap: 8, fontStyle: "italic"
                }}
                onMouseEnter={e => { if (value !== "") e.currentTarget.style.background = theme.dropdownHover || "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (value !== "") e.currentTarget.style.background = "transparent"; }}
              >
                {placeholder}
              </div>
            )}
            {filtrados.map(n => (
              <div 
                key={n.sigla}
                onClick={() => { onChange(n.sigla); setOpen(false); setBusca(""); }}
                style={{
                  padding: "8px 16px", paddingLeft: !busca ? 16 + (n.level * 16) : 16,
                  cursor: "pointer", fontSize: 13, fontFamily: "'Inter', sans-serif",
                  color: n.sigla === value ? theme.textAccent : theme.textPrimary,
                  background: n.sigla === value ? (theme.dropdownSelected || "rgba(21,101,192,0.1)") : "transparent",
                  display: "flex", alignItems: "center", gap: 8
                }}
                onMouseEnter={e => { if (n.sigla !== value) e.currentTarget.style.background = theme.dropdownHover || "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (n.sigla !== value) e.currentTarget.style.background = "transparent"; }}
              >
                {!busca && <span style={{ color: theme.textMuted, fontSize: 11, fontFamily: "monospace" }}>
                  {n.level === 0 ? "▼" : (n.level === 1 ? "├─" : "└─")}
                </span>}
                <span style={{ fontWeight: 600, flexShrink: 0 }}>{n.sigla}</span>
                <span style={{ color: theme.textSecondary, fontSize: 11, whiteSpace: "normal", lineHeight: 1.3 }}>{n.nome_oficial}</span>
              </div>
            ))}
            {filtrados.length === 0 && (
              <div style={{ padding: "8px 16px", color: theme.textMuted, fontSize: 13, textAlign: "center" }}>
                Nenhum resultado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
