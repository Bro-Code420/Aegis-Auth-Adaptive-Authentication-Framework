import { v } from "convex/values";

/**
 * AEGIS DECISION ENGINE
 * Single authority for risk-to-decision mapping.
 */

export type DecisionType = "ALLOW" | "CHALLENGE" | "RESTRICT" | "BLOCK";

export interface Decision {
    type: DecisionType;
    reason_codes: string[];
    required_actions: DecisionAction[];
}

export interface DecisionAction {
    type: "MFA_REQUIRED" | "SESSION_TERMINATE" | "ACCESS_RESTRICT" | "NONE";
    payload?: Record<string, any>;
}

/**
 * Centralized mapping of risk score and level to decision and action,
 * dynamically enforced by the application's unique SecuritySettings.
 */
export function evaluateDecision(
    riskScore: number, 
    riskLevel: string, 
    settings: any,
    clientIp?: string
): Decision {
    // 1. IP Allowlisting Enforcement
    if (settings?.ipAllowlistEnabled && clientIp) {
        // Implementation for strict IP allowlisting could go here
    }

    // 2. High-Risk Auto Block (CRITICAL)
    if (riskScore >= 0.9 || riskLevel === "CRITICAL") {
        return {
            type: "BLOCK",
            reason_codes: ["CRITICAL_RISK_DETECTED", "AUTO_BLOCK_TRIGGERED"],
            required_actions: [{ type: "SESSION_TERMINATE" }]
        };
    }

    // 3. Risk-Based Step-Up Auth (CHALLENGE)
    if (riskScore >= 0.7 || riskLevel === "HIGH" || settings?.enforceMfa) {
        return {
            type: "CHALLENGE",
            reason_codes: ["HIGH_RISK_DETECTED", "MFA_REQUIRED"],
            required_actions: [{ type: "MFA_REQUIRED" }]
        };
    }

    // 4. Monitoring / Restriction (RESTRICT)
    if (riskScore >= 0.4 || riskLevel === "MEDIUM") {
        return {
            type: "RESTRICT",
            reason_codes: ["MEDIUM_RISK_DETECTED", "RESTRICTED_ACCESS_ENABLED"],
            required_actions: [{ type: "ACCESS_RESTRICT", payload: { mode: "readonly" } }]
        };
    }

    // Default: LOW Risk (ALLOW)
    return {
        type: "ALLOW",
        reason_codes: ["LOW_RISK_VERIFIED"],
        required_actions: [{ type: "NONE" }]
    };
}
