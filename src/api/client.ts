import { SIGNAL_URL } from "../config/webrtc";
import { getAsyncStorageValue } from "../utils/auth";

export const API_BASE = `${SIGNAL_URL}/api`;
export const REQUEST_TIMEOUT = 15000; // 15 seconds in milliseconds

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
};

export async function apiRequest<T = any>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const {
    method = "GET",
    headers = {},
    body,
    timeout = REQUEST_TIMEOUT,
  } = opts;
  // include Authorization header when token exists
  const token = await getAsyncStorageValue("accessToken");
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchOpts: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "cache-control": "no-cache",
      ...authHeaders,
      ...headers,
    } as any,
  };

  if (body != null) {
    fetchOpts.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOpts.signal = controller.signal;

  try {
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
  } catch (err: any) {
    // Handle timeout specifically
    if (err.name === "AbortError") {
      const timeoutErr: any = new Error(`Request timeout: ${timeout}ms`);
      timeoutErr.status = 408; // Request Timeout
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
