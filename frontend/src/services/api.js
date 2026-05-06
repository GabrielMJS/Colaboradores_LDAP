const BASE_URL = "http://localhost:8000";

// ------------------------------------------------------------------
// Colaboradores — página inicial (ocultos filtrados)
// ------------------------------------------------------------------
export async function fetchColaboradores(unidade = null) {
  const url = unidade
    ? `${BASE_URL}/api/colaboradores?unidade=${encodeURIComponent(unidade)}`
    : `${BASE_URL}/api/colaboradores`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao buscar colaboradores");
  const json = await res.json();
  return json.data || [];
}

// ------------------------------------------------------------------
// Colaboradores — painel admin (todos, incluindo ocultos)
// ------------------------------------------------------------------
export async function fetchColaboradoresAdmin(unidade = null) {
  const url = unidade
    ? `${BASE_URL}/api/admin/colaboradores?unidade=${encodeURIComponent(unidade)}`
    : `${BASE_URL}/api/admin/colaboradores`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao buscar colaboradores (admin)");
  const json = await res.json();
  return json.data || [];
}

// ------------------------------------------------------------------
// Override — salvar customizações
// ------------------------------------------------------------------
export async function saveOverride(username, fields) {
  const res = await fetch(`${BASE_URL}/api/admin/colaboradores/${username}/override`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Erro ao salvar customizações");
  return res.json();
}

// ------------------------------------------------------------------
// Override — remover customizações
// ------------------------------------------------------------------
export async function deleteOverride(username) {
  const res = await fetch(`${BASE_URL}/api/admin/colaboradores/${username}/override`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao remover customizações");
  return res.json();
}

// ------------------------------------------------------------------
// Autenticação
// ------------------------------------------------------------------
export async function loginLDAP(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Erro de comunicação com o servidor");
  return res.json();
}

// ------------------------------------------------------------------
// Aniversariantes
// ------------------------------------------------------------------
export async function fetchAniversariantes(meses = "") {
  const res = await fetch(`${BASE_URL}/api/aniversariantes?meses=${meses}`);
  if (!res.ok) throw new Error("Erro ao buscar aniversariantes");
  const json = await res.json();
  return json.data || [];
}
