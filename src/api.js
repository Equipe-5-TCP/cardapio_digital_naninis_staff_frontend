// Defina EXPO_PUBLIC_API_URL no .env (ex.: https://naninis-api.onrender.com)
const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

async function call(path, opts = {}, token) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(API + path, { ...opts, headers });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Erro de conexão');
  return r.json();
}

export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password }).toString();
  const r = await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!r.ok) throw new Error('E-mail ou senha incorretos');
  return r.json(); // { access_token, token_type }
}

export const getOrders = (token, { status, page = 1, page_size = 10 } = {}) => {
  const q = new URLSearchParams({ page: String(page), page_size: String(page_size), ...(status ? { status } : {}) });
  return call(`/staff/orders?${q.toString()}`, {}, token); // { items, total, page, page_size, pages }
};
export const setOrderStatus = (token, id, status) =>
  call(`/staff/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);

export async function exportOrdersCsv(token, params = {}) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
  const r = await fetch(`${API}/staff/orders/export${q ? `?${q}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('Não foi possível exportar o CSV');
  const text = await r.text();
  const match = (r.headers.get('Content-Disposition') || '').match(/filename="(.+)"/);
  return { text, filename: match ? match[1] : 'pedidos.csv' };
}

export const getProducts = (token) => call('/staff/products', {}, token);
export const addProduct = (token, data) =>
  call('/staff/products', { method: 'POST', body: JSON.stringify(data) }, token);
export const editProduct = (token, id, data) =>
  call(`/staff/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token);

export const uploadImage = (token, data) =>
  call('/staff/uploads', { method: 'POST', body: JSON.stringify(data) }, token);

export const getCategories = async () => {
  const menu = await call('/menu');
  return menu.map((c) => ({ id: c.id, name: c.name }));
};

export const getDashboard = (token, params = {}) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString();
  return call(`/staff/dashboard${q ? `?${q}` : ''}`, {}, token);
};
