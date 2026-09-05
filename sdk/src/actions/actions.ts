import { DecisionAction } from "../types";
import { logout } from "../auth/auth";
import { initiateMFA } from "../mfa/mfa";

const actionCallbacks: Array<(action: DecisionAction) => void> = [];

/**
 * Step 10: Action Execution
 * Standard AegisAuth Actions:
 * SESSION_TERMINATE → logout
 * MFA_REQUIRED → start MFA
 * ACCESS_RESTRICT → limit UI
 */
export async function executeAction(action: DecisionAction): Promise<void> {
    console.log(`[Aegis Actions] Executing: ${action.type}`, action.payload);

    switch (action.type) {
        case "SESSION_TERMINATE":
            await logout();
            console.warn("[Aegis Actions] Active session terminated due to security policy");
            break;

        case "MFA_REQUIRED":
            await initiateMFA();
            console.log("[Aegis Actions] Started Multi-Factor Authentication flow");
            break;

        case "ACCESS_RESTRICT":
            console.warn("[Aegis Actions] Feature restrictions applied to this session");
            // App-level logic handled via onAction observable
            break;

        case "NONE":
            break;

        default:
            console.error(`[Aegis Actions] Unknown action type requested: ${action.type}`);
    }

    notifyObservers(action);
}

/**
 * Observe all dispatched actions
 */
export function onAction(callback: (action: DecisionAction) => void): () => void {
  actionCallbacks.push(callback);
  return () => {
    const index = actionCallbacks.indexOf(callback);
    if (index !== -1) actionCallbacks.splice(index, 1);
  };
}

function notifyObservers(action: DecisionAction) {
  actionCallbacks.forEach(cb => cb(action));
}
