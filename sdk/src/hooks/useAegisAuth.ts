import { useEffect, useState } from "react";
import { getCurrentSession, onSessionChange } from "../session/session";
import { Session } from "../types";
import { login, logout, signup, getCurrentUser } from "../auth/auth";
import { initiateMFA, verifyMFA } from "../mfa/mfa";

/**
 * Main SDK hook for authentication and risk assessment.
 */
export function useAegisAuth() {
  const [session, setSession] = useState<Session | null>(getCurrentSession());
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sync React state with SDK global state
    const unsubscribe = onSessionChange((s) => {
      setSession(s ? { ...s } : null);
    });

    // Load user profile if session is active
    if (session && session.state === "ACTIVE") {
        getCurrentUser().then(setUser).finally(() => setIsLoading(false));
    } else {
        setIsLoading(false);
    }

    return () => unsubscribe();
  }, [session?.id, session?.state]);

  const isAuthenticated = session?.state === "ACTIVE" || session?.state === "RESTRICTED";
  const isChallenged = session?.state === "CHALLENGED";
  const isBlocked = session?.state === "BLOCKED";

  return {
    session,
    user,
    isAuthenticated,
    isChallenged,
    isBlocked,
    isLoading,
    login,
    logout,
    signup,
    initiateMFA,
    verifyMFA
  };
}

/**
 * Access a session-only state
 */
export function useSession() {
  const { session } = useAegisAuth();
  return session;
}

/**
 * Access a user-only profile
 */
export function useUser() {
  const { user } = useAegisAuth();
  return user;
}

/**
 * Handle MFA specific UI states
 */
export function useMFA() {
  const { isChallenged, initiateMFA, verifyMFA } = useAegisAuth();
  return {
    isChallenged,
    initiateMFA,
    verifyMFA
  };
}
