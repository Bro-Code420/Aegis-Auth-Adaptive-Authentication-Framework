import { AegisConfig, AegisError } from "../types";

let globalConfig: AegisConfig | null = null;

/**
 * Initialize the AegisAuth SDK
 * Must provide apiKey and baseUrl at minimum.
 */
export function initAegisAuth(config: AegisConfig): void {
  // Validate apiKey presence
  if (!config.apiKey) {
    throw new AegisError("API key is mandatory for SDK initialization", "CONFIG_ERROR");
  }
  
  if (!config.baseUrl) {
    throw new AegisError("Base URL is mandatory for SDK initialization", "CONFIG_ERROR");
  }

  if (!config.appId) {
    throw new AegisError("App ID is mandatory for SDK initialization", "CONFIG_ERROR");
  }

  globalConfig = {
    ...config,
    timeout: config.timeout ?? 10000,
    retries: config.retries ?? 1,
    debug: config.debug ?? false,
  };

  if (globalConfig.debug) {
    console.log("[Aegis SDK] Initialized with config:", {
      appId: globalConfig.appId,
      baseUrl: globalConfig.baseUrl,
      debug: globalConfig.debug,
    });
  }
}

/**
 * Retrieve the active configuration
 */
export function getConfig(): AegisConfig {
  if (!globalConfig) {
    throw new AegisError("SDK not initialized. Call initAegisAuth() first.", "CONFIG_ERROR");
  }
  return globalConfig;
}
