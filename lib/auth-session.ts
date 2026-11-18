const tokenKey = "surgaal-token";
const sessionKey = "surgaal-session";

export function getTokenExpirationMs(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function clearAuthStorage() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
  document.cookie = `${tokenKey}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function logoutForExpiredToken() {
  clearAuthStorage();
  window.location.replace("/login");
}
