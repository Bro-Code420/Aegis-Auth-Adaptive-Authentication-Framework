import { initAegisAuth } from "@devanshthaware/aegis-auth";

/**
 * Initializes the AegisAuth SDK for use across the application.
 * Note: These environment variables must be provided in .env.local
 */
const aegisConfig = {
  apiKey: process.env.AEGIS_API_KEY || process.env.NEXT_PUBLIC_AEGIS_API_KEY || "ak_live_293878vm",
  baseUrl: process.env.AEGIS_BASE_URL || process.env.NEXT_PUBLIC_AEGIS_BASE_URL || "https://aegis-auth-adaptive-authentication.onrender.com",
  appId: process.env.AEGIS_APP_ID || process.env.NEXT_PUBLIC_AEGIS_APP_ID || "app_ix15ny",
  debug: true,
};


// Initialize the SDK once
if (typeof global !== 'undefined') {
    // Force initialization in node/server context
    (global as any)._aegisInitialized = true;
}
console.log("[Aegis Lib] Initializing SDK on", typeof window !== "undefined" ? "Client" : "Server", "with appId:", aegisConfig.appId);
initAegisAuth(aegisConfig);

export { aegisConfig };
