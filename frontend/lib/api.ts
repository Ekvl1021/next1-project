import { logoutForExpiredToken } from "./auth-session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:3000";

export async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const token = typeof window === "undefined" ? null : localStorage.getItem("surgaal-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    if (authenticated && response.status === 401 && typeof window !== "undefined") logoutForExpiredToken();
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || "Хүсэлт амжилтгүй.");
  }

  return response.status === 204 ? undefined as T : response.json();
}
