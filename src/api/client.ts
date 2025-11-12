import { SIGNAL_URL } from "../config/webrtc";

export const API_BASE = `${SIGNAL_URL}/api`;

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
};

export async function apiRequest<T = any>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const { method = "GET", headers = {}, body } = opts;
  const fetchOpts: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body != null) {
    fetchOpts.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOpts);
  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    // not JSON
    data = text;
  }

  if (!res.ok) {
    const err: any = new Error(
      data?.message || `Request failed: ${res.status}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}
