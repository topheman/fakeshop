"use client";

import { useState, useEffect } from "react";
import type { UserSession } from "../lib/session";

export function useUserSession() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const session = await res.json();
          setUserSession(session);
        } else {
          setUserSession(null);
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
        setUserSession(null);
      }
    };
    fetchSession();
  }, []);

  return { userSession };
}
