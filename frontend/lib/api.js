export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
let csrf = null; // token CSRF só em memória (o JWT fica em cookie httpOnly)
export const setCsrf = (t) => { csrf = t; };

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (csrf) headers['X-CSRF-Token'] = csrf;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(API + path, { method, headers, body: payload, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erro na requisição'), { status: res.status });
  return data;
}
export const receiptUrl = (id, i) => `${API}/expenses/${id}/receipts/${i}`;
