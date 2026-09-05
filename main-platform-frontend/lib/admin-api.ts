/**
 * Admin API Service Functions (Mocked)
 * These functions simulate fetching data for the admin panel.
 */

export const adminApi = {
  // Fetch platform-wide users
  getUsers: async () => {
    return [
      { id: "1", email: "alex.dev@v0.app", plan: "Pro", projects: 12, status: "Active" },
      { id: "2", email: "sarah.sec@enterprise.com", plan: "Enterprise", projects: 45, status: "Active" },
      { id: "3", email: "mike.hacker@gmail.com", plan: "Free", projects: 2, status: "Suspended" },
      { id: "4", email: "john.doe@startup.io", plan: "Pro", projects: 8, status: "Active" },
      { id: "5", email: "claire.cto@tech.co", plan: "Enterprise", projects: 124, status: "Active" },
    ]
  },

  // Fetch all projects across the platform
  getProjects: async () => {
    return [
      { id: "1", name: "PaymentApp", owner: "alex.dev@v0.app", requests: "420k", threats: 12, status: "Active" },
      { id: "2", name: "FintechAPI", owner: "sarah.sec@enterprise.com", requests: "1.2M", threats: 84, status: "Active" },
      { id: "3", name: "EcomStore", owner: "alex.dev@v0.app", requests: "85k", threats: 2, status: "Active" },
      { id: "4", name: "HealthPortal", owner: "claire.cto@tech.co", requests: "210k", threats: 142, status: "Warning" },
      { id: "5", name: "OldProject", owner: "mike.hacker@gmail.com", requests: "0", threats: 0, status: "Inactive" },
    ]
  },

  // Fetch API keys associated with projects
  getApiKeys: async () => {
    return [
      { id: "1", project: "PaymentApp", key: "ak_live_••••••••3f2d", created: "2024-03-01", status: "Active" },
      { id: "2", project: "FintechAPI", key: "ak_live_••••••••a81b", created: "2024-02-15", status: "Active" },
      { id: "3", project: "HealthPortal", key: "ak_live_••••••••91c4", created: "2024-03-05", status: "Active" },
      { id: "4", project: "EcomStore", key: "ak_live_••••••••6e22", created: "2024-01-20", status: "Revoked" },
    ]
  },

  // Fetch real-time threat logs
  getThreatLogs: async () => {
    return [
      { id: 1, timestamp: "10:41:01", project: "PaymentApp", score: 0.72, type: "Geo anomaly", status: "Flagged" },
      { id: 2, timestamp: "10:41:03", project: "FintechAPI", score: 0.88, type: "Privilege escalation", status: "Blocked" },
      { id: 3, timestamp: "10:42:15", project: "EcomStore", score: 0.45, type: "Session hijack", status: "Monitored" },
      { id: 4, timestamp: "10:43:22", project: "HealthPortal", score: 0.94, type: "Brute force", status: "Blocked" },
    ]
  },

  // Fetch platform analytics
  getAnalytics: async () => {
    return {
      requestsPerHour: [40, 65, 30, 85, 45, 70, 95, 30],
      riskDistribution: [
        { label: "Low", value: 65 },
        { label: "Medium", value: 22 },
        { label: "High", value: 10 },
        { label: "Critical", value: 3 },
      ]
    }
  },

  // Fetch infrastructure status
  getSystemHealth: async () => {
    return [
      { name: "ML Backend", status: "Healthy", latency: "42ms" },
      { name: "API Gateway", status: "Healthy", latency: "12ms" },
      { name: "Primary Database", status: "Healthy", latency: "5ms" },
    ]
  }
}
