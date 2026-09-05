"use client";

import { useEffect } from "react";
import { initAegisAuth, startMonitoring, stopMonitoring, collectSignal } from "@devanshthaware/aegis-auth";

export function AegisClientProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_AEGIS_API_KEY || "ak_live_293878vm";
    const baseUrl = process.env.NEXT_PUBLIC_AEGIS_BASE_URL || "https://aegis-auth-adaptive-authentication.onrender.com";
    const appId = process.env.NEXT_PUBLIC_AEGIS_APP_ID || "app_ix15ny";

    console.log("[Aegis Client] Initializing Aegis real-time monitoring with App:", appId);

    try {
      initAegisAuth({
        apiKey,
        baseUrl,
        appId,
        debug: true,
      });

      // Start periodic telemetry heartbeat (every 10s)
      startMonitoring(10000);

      // Listen to behavioral mouse & keyboard signals on client
      let lastMove = 0;
      const handleMouseMove = () => {
        const now = Date.now();
        if (now - lastMove > 15000) {
          lastMove = now;
          collectSignal("SIGNAL_RECEIVED", { interaction: "mouse_movement", ts: now }).catch(() => {});
        }
      };

      window.addEventListener("mousemove", handleMouseMove, { passive: true });

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        stopMonitoring();
      };
    } catch (e) {
      console.warn("[Aegis Client] Telemetry init notice:", e);
    }
  }, []);

  return <>{children}</>;
}
