"use client";

import { useEffect } from "react";
import { getTokenExpirationMs, logoutForExpiredToken } from "../lib/auth-session";

export default function AuthExpirationGuard() {
  useEffect(() => {
    const checkExpiration = () => {
      const token = localStorage.getItem("surgaal-token");
      if (!token) return;

      const expiresAt = getTokenExpirationMs(token);
      if (!expiresAt || Date.now() >= expiresAt) logoutForExpiredToken();
    };

    checkExpiration();
    const intervalId = window.setInterval(checkExpiration, 1000);
    window.addEventListener("focus", checkExpiration);
    window.addEventListener("pageshow", checkExpiration);
    document.addEventListener("visibilitychange", checkExpiration);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", checkExpiration);
      window.removeEventListener("pageshow", checkExpiration);
      document.removeEventListener("visibilitychange", checkExpiration);
    };
  }, []);

  return null;
}
