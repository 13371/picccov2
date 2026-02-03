const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN?.trim() || "http://localhost:3001";

function getToken(): string | null {
  try {
    return localStorage.getItem("piccco_token");
  } catch {
    return null;
  }
}

function joinUrl(origin: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const o = origin.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${o}${p}`;
}

async function apiFetch(path: string, init?: RequestInit) {
  const url = joinUrl(API_ORIGIN, path);

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }

  return res;
}

export async function apiGet(path: string): Promise<any> {
  const res = await apiFetch(path, { method: "GET" });
  return res.json();
}

export async function apiPost(path: string, body?: any): Promise<any> {
  const res = await apiFetch(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiPatch(path: string, body?: any): Promise<any> {
  const res = await apiFetch(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

