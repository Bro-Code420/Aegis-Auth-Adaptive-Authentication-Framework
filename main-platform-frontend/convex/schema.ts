import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    activities: defineTable({
        applicationId: v.id("applications"),
        timestamp: v.float64(),
        type: v.optional(v.string()),      // e.g. "login" | "risk_update" | "blocked" | "challenged"
        sessionId: v.optional(v.id("sessions")),
        userEmail: v.optional(v.string()),
        ip: v.optional(v.string()),
        location: v.optional(v.string()),
        riskScore: v.optional(v.float64()),
        details: v.optional(v.any()),
        // Legacy fields from old documents
        action: v.optional(v.string()),
        risk: v.optional(v.string()),
        device: v.optional(v.string()),
    }).index("by_application", ["applicationId"]),
    events: defineTable({
        type: v.string(), // SIGNAL_RECEIVED | RISK_CALCULATED | DECISION_MADE | ACTION_DISPATCHED | ACTION_EXECUTED | STATE_TRANSITIONED
        sessionId: v.id("sessions"),
        correlationId: v.string(),
        payload: v.any(),
        timestamp: v.float64(),
        applicationId: v.id("applications"),
    })
    .index("by_session", ["sessionId"])
    .index("by_correlation", ["correlationId"])
    .index("by_application", ["applicationId"]),
    applications: defineTable({
        apiKey: v.string(),
        appId: v.string(),
        environment: v.string(),
        mlEnhancement: v.boolean(),
        name: v.string(),
        redirectUri: v.optional(v.string()),
        appUrl: v.optional(v.string()), // Added for backward compatibility on old records, but required on new ones
        allowedOrigins: v.optional(v.array(v.string())),
        riskPolicyId: v.id("riskPolicies"),
        secret: v.string(),
        status: v.string(),
        type: v.string(),
        userId: v.string(),
        organizationId: v.optional(v.id("organizations")),
    }).index("by_user", ["userId"]).index("by_org", ["organizationId"]).index("by_api_key", ["apiKey"]),
    organizations: defineTable({
        name: v.string(),
        ownerId: v.string(),
        createdAt: v.float64(),
    }).index("by_owner", ["ownerId"]),
    organizationMembers: defineTable({
        organizationId: v.id("organizations"),
        userId: v.string(),
        role: v.string(), // "owner", "admin", "member"
    }).index("by_user", ["userId"]).index("by_org", ["organizationId"]),
    messages: defineTable({
        author: v.string(),
        body: v.string(),
    }).index("by_author", ["author"]),
    riskPolicies: defineTable({
        description: v.string(),
        mlEnabled: v.boolean(),
        name: v.string(),
        thresholds: v.object({
            critical: v.string(),
            high: v.string(),
            low: v.string(),
            medium: v.string(),
        }),
        userId: v.string(),
    }).index("by_user", ["userId"]),
    sessions: defineTable({
        applicationId: v.id("applications"),
        browser: v.string(),
        device: v.string(),
        ip: v.string(),
        location: v.string(),
        loginTime: v.float64(),
        userEmail: v.string(),
        // New fields — optional so legacy documents remain valid
        correlationId: v.optional(v.string()),
        score: v.optional(v.float64()),
        state: v.optional(v.string()), // "NEW" | "EVALUATING" | "ACTIVE" | "CHALLENGED" | "RESTRICTED" | "BLOCKED" | "TERMINATED"
        stateVersion: v.optional(v.float64()),
        updatedAt: v.optional(v.float64()),
        pinataCid: v.optional(v.string()), // Added for secure metadata storage
        // Legacy fields from old documents
        riskScore: v.optional(v.float64()),
        status: v.optional(v.string()),
    }).index("by_application", ["applicationId"]),
    supportMessages: defineTable({
        content: v.string(),
        isAiGenerated: v.boolean(),
        senderId: v.string(),
        senderRole: v.string(),
        status: v.string(),
        ticketId: v.id("supportTickets"),
        timestamp: v.float64(),
    }).index("by_ticket", ["ticketId"]),
    supportTickets: defineTable({
        createdAt: v.float64(),
        issueType: v.string(),
        status: v.string(),
        updatedAt: v.float64(),
        userId: v.string(),
    }).index("by_user", ["userId"]).index("by_status", ["status"]),
    systemSettings: defineTable({
        key: v.string(),
        value: v.any(),
    }).index("by_key", ["key"]),
    users: defineTable({
        email: v.string(),
        password_hash: v.string(),
        name: v.string(),
        role: v.union(v.literal("USER"), v.literal("ADMIN")),
        created_at: v.number(),
        updated_at: v.number(),
        last_login_at: v.optional(v.number()),
        failed_login_attempts: v.optional(v.number()),
        locked_until: v.optional(v.number())
    }).index("by_email", ["email"]),
    loginHistory: defineTable({
        user_id: v.id("users"),
        email: v.string(),
        ip_address: v.optional(v.string()),
        device: v.optional(v.string()),
        location: v.optional(v.string()),
        status: v.union(v.literal("SUCCESS"), v.literal("FAILED")),
        created_at: v.number()
    }).index("by_user", ["user_id"]),
    securitySettings: defineTable({
        applicationId: v.id("applications"),
        enforceMfa: v.boolean(),
        riskBasedAuth: v.boolean(),
        autoBlockHighRisk: v.boolean(),
        sessionRecording: v.boolean(),
        ipAllowlistEnabled: v.boolean(),
        updatedAt: v.number(),
    }).index("by_application", ["applicationId"]),
    alerts: defineTable({
        userId: v.string(), // Clerk user ID of the app owner
        applicationId: v.optional(v.id("applications")), // Optional for org-level alerts
        type: v.union(v.literal("HIGH_RISK"), v.literal("LOGIN"), v.literal("BLOCKED"), v.literal("API_EVENT")),
        message: v.string(),
        severity: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("CRITICAL")),
        correlationId: v.optional(v.string()),
        isRead: v.boolean(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]).index("by_application", ["applicationId"]).index("by_is_read", ["isRead"]),
    mlScores: defineTable({
        sessionId: v.id("sessions"),
        applicationId: v.id("applications"),
        score: v.float64(),
        factors: v.object({
            ipRisk: v.float64(),
            deviceTrust: v.float64(),
            geoAnomaly: v.float64()
        }),
        modelVersion: v.string(),
        correlationId: v.string(),
        createdAt: v.number()
    })
    .index("by_session", ["sessionId"])
    .index("by_session_time", ["sessionId", "createdAt"])
    .index("by_application", ["applicationId"])
    .index("by_correlation", ["correlationId"])
});
