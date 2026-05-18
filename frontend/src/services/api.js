const BASE_URL = "http://localhost:8001";
const IS_PRODUCTION = false; // Ajustar se necessário

function getHeaders() {
  return { "Content-Type": "application/json" };
}

// ------------------------------------------------------------------
// Colaboradores — página inicial (ocultos filtrados)
// ------------------------------------------------------------------
export async function fetchColaboradores(unidade = null) {
  const url = unidade
    ? `${BASE_URL}/api/colaboradores?unidade=${encodeURIComponent(unidade)}`
    : `${BASE_URL}/api/colaboradores`;
  const res = await fetch(url, { 
    headers: getHeaders(),
    credentials: "include" 
  });
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
  const res = await fetch(url, { 
    headers: getHeaders(),
    credentials: "include"
  });
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
    headers: getHeaders(),
    body: JSON.stringify(fields),
    credentials: "include"
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
    headers: getHeaders(),
    credentials: "include"
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
    credentials: "include"
  });
  if (!res.ok) throw new Error("Erro de comunicação com o servidor");
  return res.json();
}

export async function logoutLDAP() {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
  if (!res.ok) throw new Error("Erro ao realizar logout");
  return res.json();
}

// ------------------------------------------------------------------
// Aniversariantes
// ------------------------------------------------------------------
export async function fetchAniversariantes(meses = "") {
  const res = await fetch(`${BASE_URL}/api/aniversariantes?meses=${meses}`, { 
    headers: getHeaders(),
    credentials: "include"
  });
  if (!res.ok) throw new Error("Erro ao buscar aniversariantes");
  const json = await res.json();
  return json.data || [];
}

// ------------------------------------------------------------------
// Capas de Assinatura
// ------------------------------------------------------------------
export async function fetchCapas() {
  const res = await fetch(`${BASE_URL}/api/capas`, { 
    headers: getHeaders(),
    credentials: "include"
  });
  if (!res.ok) throw new Error("Erro ao buscar capas");
  const json = await res.json();
  return json.data || [];
}

export async function uploadCapa(file) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = getHeaders();
  // Remove o Content-Type para o navegador preencher corretamente com o boundary do multipart/form-data
  delete headers["Content-Type"];

  const res = await fetch(`${BASE_URL}/api/admin/capas/upload`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include"
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Erro ao fazer upload da capa");
  }
  return res.json();
}

export async function deleteCapa(filename) {
  const res = await fetch(`${BASE_URL}/api/admin/capas/${encodeURIComponent(filename)}`, {
    method: "DELETE",
    headers: getHeaders(),
    credentials: "include"
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Erro ao excluir a capa");
  }
  return res.json();
}
