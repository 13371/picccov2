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
    // 统一错误处理
    let errorMessage = '';
    try {
      const json = await res.json();
      errorMessage = json.message || JSON.stringify(json);
    } catch {
      const text = await res.text();
      errorMessage = text || `${res.status}`;
    }

    // 401：token 无效，清除 token 并跳转登录
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('piccco_token');
        window.location.href = '/login';
      }
      throw new Error('未授权，请重新登录');
    }

    // 403 且 message 包含 "private"：跳转解锁页面
    if (res.status === 403 && errorMessage.includes('private')) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/unlock?next=${encodeURIComponent(currentPath)}`;
      }
      throw new Error('需要隐私解锁');
    }

    // 其他错误
    throw new Error(errorMessage || `${res.status}`);
  }

  return res;
}

// 导出 apiFetch 供外部使用（用于 fire and forget 场景）
export { apiFetch };

export async function apiGet(path: string, signal?: AbortSignal): Promise<any> {
  const res = await apiFetch(path, { method: "GET", signal });
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

export async function apiDelete(path: string): Promise<any> {
  const res = await apiFetch(path, {
    method: "DELETE",
  });
  return res.json();
}

