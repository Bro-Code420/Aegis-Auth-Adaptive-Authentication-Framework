import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { getConfig } from "../core/config";
import { AegisError, AegisErrorCode } from "../types";

let clientInstance: AxiosInstance | null = null;
let currentSessionId: string | null = null;
let currentCorrelationId: string | null = null;

/**
 * Get or create an axios instance for the SDK
 * Enforces x-api-key, session_id, and correlation_id headers.
 */
function getClient(): AxiosInstance {
    if (clientInstance) return clientInstance;

    const config = getConfig();

    clientInstance = axios.create({
        baseURL: config.baseUrl,
        timeout: config.timeout,
        headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "x-app-id": config.appId,
        },
    });

    // Request interceptor to attach dynamic headers
    clientInstance.interceptors.request.use((req) => {
        if (currentSessionId) req.headers["x-session-id"] = currentSessionId;
        if (currentCorrelationId) req.headers["x-correlation-id"] = currentCorrelationId;
        return req;
    });

    // Response interceptor to handle errors and extract decisions
    clientInstance.interceptors.response.use(
        (response) => {
            // Success
            return response;
        },
        (error) => {
            // Handle common status codes
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;

            let code: AegisErrorCode = "NETWORK_ERROR";
            if (status === 401 || status === 403) code = "AUTH_ERROR";
            
            throw new AegisError(message, code, error.response?.data);
        }
    );

    return clientInstance;
}

/**
 * Set the current tracking headers
 */
export function setTracking(sessionId: string | null, correlationId: string | null) {
    currentSessionId = sessionId;
    currentCorrelationId = correlationId;
}

/**
 * Internal API methods
 */
export const api = {
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await getClient().get<T>(url, config);
        return response.data;
    },
    async post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await getClient().post<T>(url, data, config);
        return response.data;
    }
};
