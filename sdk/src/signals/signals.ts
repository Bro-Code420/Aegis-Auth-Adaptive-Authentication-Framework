import { api } from "../api/client";
import { getCurrentSession } from "../session/session";
import { AegisEventType, AegisResponse, ClaimedSignal, TelemetryPacket } from "../types";

let monitorInterval: NodeJS.Timeout | null = null;
let currentSequenceNumber = 0;

/**
 * Generates a random cryptographic nonce
 */
function generateNonce(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Hardened Signal Collection.
 * Collects telemetry packets containing sequence number, nonce, claimed signals, and optional attestations.
 */
export async function collectSignal(type: AegisEventType, payload: any): Promise<AegisResponse<any>> {
    const session = getCurrentSession();
    currentSequenceNumber += 1;

    const packet: TelemetryPacket = {
        sequenceNumber: currentSequenceNumber,
        nonce: generateNonce(),
        claimed: getClaimedSignals(),
        attested: payload?.attested,
        context: {
            ...payload,
            version: session?.stateVersion,
        }
    };

    const tracking = {
        sessionId: session?.id,
        correlationId: session?.correlationId,
        type,
        packet,
        payload: {
            ...payload,
            fingerprint: {
                ...packet.claimed,
                timestamp: packet.claimed.clientTimestamp,
            },
            sequenceNumber: packet.sequenceNumber,
            nonce: packet.nonce,
        }
    };

    return await api.post<AegisResponse<any>>("/signals", tracking);
}

/**
 * Continuous Session Telemetry Stream.
 */
export function startMonitoring(intervalMs: number = 10000): void {
    if (monitorInterval) return;

    console.log("[Aegis Monitoring] Continuous session monitoring started");
    monitorInterval = setInterval(async () => {
        try {
            const session = getCurrentSession();
            if (session && (session.state === "ACTIVE" || session.state === "RESTRICTED")) {
                await collectSignal("SIGNAL_RECEIVED", { context: "continuous_monitoring" });
            }
        } catch (error) {
            console.error("[Aegis Monitoring] Verification check failed:", error);
        }
    }, intervalMs);
}

/**
 * Stop continuous monitoring
 */
export function stopMonitoring(): void {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
        console.log("[Aegis Monitoring] Continuous session monitoring stopped");
    }
}

/**
 * Internal device / browser signal extraction
 */
function getClaimedSignals(): ClaimedSignal {
  const isBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";
  return {
    userAgent: isBrowser ? navigator.userAgent : "node-client",
    platform: isBrowser ? navigator.platform : "node",
    screenResolution: isBrowser ? `${window.screen.width}x${window.screen.height}` : "1920x1080",
    timezone: isBrowser ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
    language: isBrowser ? navigator.language : "en-US",
    clientTimestamp: Date.now(),
  };
}
