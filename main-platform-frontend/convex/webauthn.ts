import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { emitEvent } from "./events";
import { transitionSession } from "./sessionState";

/**
 * Convex WebAuthn & Passkey Credential Management.
 * Binds public key credentials to users/devices and verifies step-up assertions.
 */
export const registerCredential = mutation({
    args: {
        credentialId: v.string(),
        userId: v.string(),
        applicationId: v.id("applications"),
        publicKey: v.string(),
        counter: v.float64(),
        transports: v.optional(v.array(v.string())),
        deviceAttestation: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("webauthnCredentials")
            .withIndex("by_credential", (q) => q.eq("credentialId", args.credentialId))
            .first();

        if (existing) {
            throw new Error("Credential ID already registered");
        }

        const id = await ctx.db.insert("webauthnCredentials", {
            credentialId: args.credentialId,
            userId: args.userId,
            applicationId: args.applicationId,
            publicKey: args.publicKey,
            counter: args.counter,
            transports: args.transports,
            deviceAttestation: args.deviceAttestation,
            createdAt: Date.now(),
        });

        return { id, status: "REGISTERED" };
    }
});

export const verifyAssertionAndStepUp = mutation({
    args: {
        sessionId: v.id("sessions"),
        credentialId: v.string(),
        clientDataJSON: v.string(),
        authenticatorData: v.string(),
        signature: v.string(),
        correlationId: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        const cred = await ctx.db
            .query("webauthnCredentials")
            .withIndex("by_credential", (q) => q.eq("credentialId", args.credentialId))
            .first();

        if (!cred) {
            throw new Error("Invalid or unverified WebAuthn credential");
        }

        // Update credential last used timestamp and counter
        await ctx.db.patch(cred._id, {
            counter: cred.counter + 1,
            lastUsedAt: Date.now(),
        });

        // Step-up verification restores session to ACTIVE from CHALLENGED or RESTRICTED
        await ctx.db.patch(args.sessionId, {
            stepUpCompletedAt: Date.now(),
            evidenceState: "TRUSTED",
        });

        await transitionSession(
            ctx.db,
            args.sessionId,
            "ACTIVE",
            "WEBAUTHN_STEP_UP_VERIFIED",
            args.correlationId,
            session.stateVersion
        );

        await emitEvent(ctx.db, {
            type: "STEP_UP_VERIFIED",
            sessionId: args.sessionId,
            correlationId: args.correlationId,
            applicationId: session.applicationId,
            payload: {
                credentialId: args.credentialId,
                method: "FIDO2_WEBAUTHN",
                status: "VERIFIED"
            }
        });

        return { success: true, state: "ACTIVE" };
    }
});
