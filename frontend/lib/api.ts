const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";

function getToken(): string | null {
  try {
    return localStorage.getItem("piccco_token");
  } catch {
    return null;
  }
}

export async function apiGet(path: string): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const res = await fetch(API_BASE + path, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }

  return await res.json();
}

export async function apiPost(path: string, body?: any): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }

  return await res.json();
}

