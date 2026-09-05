import { Decision, AegisError } from "../types";
import { executeAction } from "../actions/actions";
import { updateSessionState } from "../session/session";

/**
 * Handle a canonical decision from the backend.
 * Mapping Decision.type:
 * ALLOW → activate session
 * CHALLENGE / STEP_UP → trigger MFA / WebAuthn
 * RESTRICT / LIMIT → apply restrictions
 * CONTAIN / REVOKE / BLOCK → terminate / contain session
 */
export async function handleDecision(decision: Decision): Promise<void> {
    const { type, required_actions } = decision;

    switch (type) {
        case "ALLOW":
            updateSessionState("ACTIVE");
            break;
        case "CHALLENGE":
        case "STEP_UP":
            updateSessionState("CHALLENGED");
            // If the decision requires MFA, start it
            if (required_actions.some(a => a.type === "MFA_REQUIRED")) {
                await executeAction({ type: "MFA_REQUIRED", payload: {} });
                throw new AegisError("MFA / Passkey Verification Required", "MFA_REQUIRED");
            }
            break;

        case "RESTRICT":
        case "LIMIT":
            updateSessionState("RESTRICTED");
            await executeAction({ type: "ACCESS_RESTRICT", payload: {} });
            break;

        case "CONTAIN":
            updateSessionState("CONTAINED");
            await executeAction({ type: "CONTAIN_SESSION", payload: {} });
            throw new AegisError("Session contained due to detected threat anomaly", "ACCESS_DENIED");

        case "REVOKE":
        case "BLOCK":
            updateSessionState("REVOKED");
            await executeAction({ type: "SESSION_TERMINATE", payload: {} });
            throw new AegisError("Access blocked due to high security risk", "ACCESS_DENIED");

        default:
            throw new AegisError(`Unsupported decision type: ${type}`, "CONFIG_ERROR");
    }
}
