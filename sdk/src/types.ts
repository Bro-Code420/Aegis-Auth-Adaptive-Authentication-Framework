/**
 * Configuration for AegisAuth SDK initialization
 */
export interface AegisConfig {
  apiKey: string;
  baseUrl: string;
  appId: string;
  debug?: boolean;
  timeout?: number;
  retries?: number;
}

/**
 * Signal Classification (Claimed, Observed, Attested)
 */
export interface ClaimedSignal {
  userAgent: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  language: string;
  clientTimestamp: number;
}

export interface AttestedSignal {
  credentialId?: string;
  authenticatorAttachment?: string;
  webauthnAssertion?: string;
  deviceKeySignature?: string;
}

export interface TelemetryPacket {
  sequenceNumber: number;
  nonce: string;
  claimed: ClaimedSignal;
  attested?: AttestedSignal;
  context?: Record<string, any>;
}

/**
 * Backward-compatible SignalPayload interface
 */
export interface SignalPayload extends ClaimedSignal {
  timestamp: number;
}

/**
 * Authentication payloads
 */
export interface LoginPayload {
  email: string;
  password?: string;
  metadata?: Record<string, any>;
  passkeyAssertion?: any;
}

export interface SignupPayload extends LoginPayload {
  name?: string;
}

/**
 * Canonical Decisions
 */
export type DecisionType = "ALLOW" | "CHALLENGE" | "STEP_UP" | "LIMIT" | "RESTRICT" | "CONTAIN" | "REVOKE" | "BLOCK";

export interface DecisionAction {
  type: "MFA_REQUIRED" | "SESSION_TERMINATE" | "ACCESS_RESTRICT" | "CONTAIN_SESSION" | "NONE";
  payload?: Record<string, any>;
}

export interface Decision {
  type: DecisionType;
  required_actions: DecisionAction[];
  reason_codes: string[];
  evidence_state?: "TRUSTED" | "SUSPICIOUS" | "UNKNOWN" | "COMPROMISED";
  confidence?: number;
  version?: number;
}

/**
 * Hardened Session Information
 */
export type SessionState = 
  | "NEW" 
  | "EVALUATING" 
  | "ACTIVE" 
  | "SUSPICIOUS" 
  | "CHALLENGED" 
  | "RESTRICTED" 
  | "CONTAINED" 
  | "REVOKED" 
  | "BLOCKED" 
  | "RECOVERY" 
  | "TERMINATED";

export interface Session {
  id: string;
  state: SessionState;
  correlationId: string;
  stateVersion?: number;
  sequenceNumber?: number;
  userId?: string;
  email?: string;
  riskScore?: number;
  evidenceState?: string;
}

/**
 * SDK Responses
 */
export interface AegisResponse<T> {
  data: T;
  decision?: Decision;
  sessionId?: string;
  correlationId?: string;
  version?: number;
}

export interface AuthResponse extends AegisResponse<{
  user: {
    id: string;
    email: string;
    name?: string;
  };
  token: string;
}> {}

/**
 * Events
 */
export type AegisEventType = 
  | "SIGNAL_RECEIVED" 
  | "RISK_CALCULATED" 
  | "DECISION_MADE" 
  | "ACTION_DISPATCHED" 
  | "ACTION_EXECUTED" 
  | "STATE_TRANSITIONED"
  | "MFA_STARTED"
  | "MFA_VERIFIED"
  | "STEP_UP_VERIFIED"
  | "REPLAY_BLOCKED";

/**
 * Errors
 */
export type AegisErrorCode = 
  | "AUTH_ERROR" 
  | "SESSION_EXPIRED" 
  | "ACCESS_DENIED" 
  | "NETWORK_ERROR"
  | "CONFIG_ERROR"
  | "MFA_REQUIRED"
  | "REPLAY_ATTACK_DETECTED"
  | "STALE_DECISION";

export class AegisError extends Error {
  code: AegisErrorCode;
  details?: any;

  constructor(message: string, code: AegisErrorCode, details?: any) {
    super(message);
    this.name = "AegisError";
    this.code = code;
    this.details = details;
  }
}
