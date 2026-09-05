import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initAegisAuth } from "../core/config";
import { AegisConfig, Session } from "../types";
import { getCurrentSession, onSessionChange } from "../session/session";

interface AegisContextType {
  session: Session | null;
  isLoading: boolean;
}

const AegisContext = createContext<AegisContextType | undefined>(undefined);

interface AegisProviderProps {
  config: AegisConfig;
  children: ReactNode;
}

/**
 * Global provider for AegisAuth SDK.
 * Initializes the configuration and provides session context.
 */
export const AegisProvider: React.FC<AegisProviderProps> = ({ config, children }) => {
  const [session, setSession] = useState<Session | null>(getCurrentSession());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Initialize Global Config
    try {
      initAegisAuth(config);
    } catch (e) {
      console.error("[Aegis SDK] Initialization failed:", e);
    }

    // 2. Sync Session States
    const unsubscribe = onSessionChange((s) => {
      setSession(s ? { ...s } : null);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [config.apiKey, config.appId]);

  return (
    <AegisContext.Provider value={{ session, isLoading }}>
      {children}
    </AegisContext.Provider>
  );
};

export const useAegisSession = () => {
  const context = useContext(AegisContext);
  if (context === undefined) {
    throw new Error("useAegisSession must be used within an AegisProvider");
  }
  return context;
};
