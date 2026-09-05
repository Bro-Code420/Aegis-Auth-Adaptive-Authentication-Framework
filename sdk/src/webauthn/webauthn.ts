/**
 * WebAuthn & FIDO2 Passkey Ceremony Manager for AegisAuth SDK.
 * Provides phishing-resistant hardware-bound authentication and step-up verification.
 */
import { api } from "../api/client";
import { getCurrentSession } from "../session/session";
import { AegisResponse } from "../types";

export interface RegisterPasskeyOptions {
  userId: string;
  userEmail: string;
  userName?: string;
  rpName?: string;
}

export async function registerPasskey(options: RegisterPasskeyOptions): Promise<AegisResponse<any>> {
  if (typeof window === "undefined" || !window.navigator.credentials) {
    throw new Error("WebAuthn is not supported in this environment");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdBytes = new TextEncoder().encode(options.userId);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: options.rpName || "AegisAuth Protected App",
      id: window.location.hostname,
    },
    user: {
      id: userIdBytes,
      name: options.userEmail,
      displayName: options.userName || options.userEmail,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "preferred",
      residentKey: "preferred",
    },
    timeout: 60000,
    attestation: "direct",
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Failed to create WebAuthn credential");
  }

  // Register public key credential with backend
  const payload = {
    credentialId: credential.id,
    userId: options.userId,
    rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
    type: credential.type,
  };

  return await api.post<AegisResponse<any>>("/webauthn/register", payload);
}

export async function authenticatePasskey(credentialId?: string): Promise<AegisResponse<any>> {
  if (typeof window === "undefined" || !window.navigator.credentials) {
    throw new Error("WebAuthn is not supported in this environment");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const allowCredentials: PublicKeyCredentialDescriptor[] = credentialId
    ? [{ id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)), type: "public-key" }]
    : [];

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    userVerification: "required",
    rpId: window.location.hostname,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  };

  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  })) as PublicKeyCredential;

  if (!assertion) {
    throw new Error("WebAuthn assertion failed or canceled");
  }

  const session = getCurrentSession();
  const payload = {
    sessionId: session?.id,
    correlationId: session?.correlationId,
    credentialId: assertion.id,
    rawId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
  };

  return await api.post<AegisResponse<any>>("/webauthn/verify", payload);
}
