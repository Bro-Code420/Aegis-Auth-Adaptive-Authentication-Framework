import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

export const validateRequest = async (ctx: any, request: Request) => {
    const apiKey = request.headers.get("x-api-key");
    const origin = request.headers.get("x-origin") || request.headers.get("origin") || "";

    if (!apiKey || !origin) {
        return { error: "Missing API key or origin", status: 400 };
    }

    const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();

    // Query application
    const app = await ctx.runQuery(api.applications.getByApiKey, { apiKey });

    if (!app) {
        return { error: "Invalid API key", status: 401 };
    }

    const allowed = (app.allowedOrigins || []).map((o: string) =>
        o.replace(/\/$/, "").toLowerCase()
    );

    if (!allowed.includes(normalizedOrigin)) {
        console.warn({
            type: "ORIGIN_BLOCKED",
            apiKey,
            origin,
            timestamp: Date.now()
        });
        return { error: "Origin not allowed", status: 403 };
    }

    return { app };
};

// Apply to /risk/evaluate
http.route({
    path: "/risk/evaluate",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const auth = await validateRequest(ctx, request);
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { 'Content-Type': 'application/json' } });
        }
        
        try {
            const body = await request.json();
            // In a real implementation this would trigger convex/ml assessRisk etc.
            return new Response(JSON.stringify({ success: true, app: auth.app.name, message: "Risk evaluated" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
        }
    }),
});

// Apply to /session/start
http.route({
    path: "/session/start",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const auth = await validateRequest(ctx, request);
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, app: auth.app.name }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
});

// Apply to /session/update
http.route({
    path: "/session/update",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const auth = await validateRequest(ctx, request);
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, app: auth.app.name }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
});

// Apply to /alerts
http.route({
    path: "/alerts",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const auth = await validateRequest(ctx, request);
        if (auth.error) {
            return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, alerts: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
});

export default http;
