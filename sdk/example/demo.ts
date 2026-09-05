/**
 * Example/Demo file for AegisAuth SDK
 * Shows practical usage patterns
 * Run with: npx ts-node example/demo.ts
 */

import { AegisAuth, LoginPayload } from "../src/index";

/**
 * Demo: Basic login protection
 */
async function demoBasicLogin() {
  console.log("\n=== DEMO: Basic Login Protection ===\n");

  const client = new AegisAuth({
    apiKey: "demo-key-12345",
    endpoint: "http://localhost:8000",
    debug: true,
  });

  const loginPayload: LoginPayload = {
    userId: "user123",
    email: "user@example.com",
    metadata: {
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
    },
  };

  try {
    console.log("Calling protectLogin...");
    const risk = await client.protectLogin(loginPayload);

    console.log("\nRisk Assessment Result:");
    console.log(`  Risk Score: ${risk.risk_score}`);
    console.log(`  Risk Level: ${risk.risk_level}`);
    console.log(`  Components: ${JSON.stringify(risk.components)}`);

    // Handle based on risk level
    if (client.isCritical(risk)) {
      console.log(
        "\n⚠️  CRITICAL RISK DETECTED - Block login, require MFA"
      );
    } else if (client.isHighRisk(risk)) {
      console.log(
        "\n⚠️  HIGH RISK DETECTED - Require step-up authentication"
      );
    } else {
      console.log("\n✅ Risk acceptable - Proceed with login");
    }
  } catch (error) {
    console.error("Login protection failed:", error);
  }

  client.destroy();
}

/**
 * Demo: Session monitoring
 */
async function demoSessionMonitoring() {
  console.log("\n=== DEMO: Continuous Session Monitoring ===\n");

  const client = new AegisAuth({
    apiKey: "demo-key-12345",
    endpoint: "http://localhost:8000",
    debug: true,
    monitorInterval: 3000, // Check every 3 seconds for demo
  });

  console.log("Starting continuous monitoring...");

  let checkCount = 0;
  client.startMonitoring((risk) => {
    checkCount++;
    console.log(`\n[Check #${checkCount}] Risk Level: ${risk.risk_level}`);

    if (client.isCritical(risk)) {
      console.log("⚠️  CRITICAL - Terminate session immediately");
    } else if (client.isHighRisk(risk)) {
      console.log("⚠️  HIGH - Enforce re-authentication");
    } else {
      console.log("✅ Session safe");
    }

    // Stop monitoring after 3 checks for demo
    if (checkCount >= 3) {
      client.stopMonitoring();
      console.log("\nMonitoring stopped");
      client.destroy();
    }
  });

  // Keep process alive for monitoring
  await new Promise((resolve) => setTimeout(resolve, 15000));
}

/**
 * Demo: Simulating anomalies
 */
async function demoAnomalyDetection() {
  console.log("\n=== DEMO: Anomaly Detection with Simulated Flags ===\n");

  const client = new AegisAuth({
    apiKey: "demo-key-12345",
    endpoint: "http://localhost:8000",
    debug: true,
  });

  // Simulate various anomalies
  const anomalies = [
    {
      name: "New Device Detection",
      flags: { newDevice: true },
    },
    {
      name: "Country Change",
      flags: { countryChange: true },
    },
    {
      name: "VPN Usage",
      flags: { vpn: true },
    },
    {
      name: "API Burst",
      flags: { apiBurst: true },
    },
    {
      name: "Privilege Escalation Attempt",
      flags: { privilegeEscalation: true },
    },
  ];

  for (const anomaly of anomalies) {
    console.log(`\nTesting: ${anomaly.name}`);
    try {
      const risk = await client.checkRisk({
        userId: "user123",
        email: "user@example.com",
        simulateFlags: anomaly.flags,
      });

      console.log(`  Result: ${risk.risk_level} (Score: ${risk.risk_score})`);
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }

  client.destroy();
}

/**
 * Demo: Error handling
 */
async function demoErrorHandling() {
  console.log("\n=== DEMO: Error Handling & Resilience ===\n");

  const client = new AegisAuth({
    apiKey: "demo-key-12345",
    endpoint: "http://localhost:9999", // Non-existent endpoint
    timeout: 5000,
    retries: 1,
    debug: true,
  });

  try {
    console.log("Attempting login to unreachable backend...");
    const risk = await client.protectLogin({
      userId: "user123",
      email: "user@example.com",
    });

    console.log("\nFallback Response (Backend Unreachable):");
    console.log(`  Risk Level: ${risk.risk_level}`);
    console.log(`  Risk Score: ${risk.risk_score}`);
    console.log("  (Using safe default LOW risk)");
  } catch (error) {
    console.error("Error:", error);
  }

  client.destroy();
}

/**
 * Main demo runner
 */
async function runDemos() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║     AegisAuth SDK - Demo Examples          ║");
  console.log("╚════════════════════════════════════════════╝");

  // Uncomment the demos you want to run
  try {
    // await demoBasicLogin();
    // await demoSessionMonitoring();
    // await demoAnomalyDetection();
    // await demoErrorHandling();

    console.log("\n✅ All demos completed!");
    console.log("\nNote: These demos show SDK patterns.");
    console.log("Configure your backend endpoint and API key to test live.\n");
  } catch (error) {
    console.error("Demo error:", error);
  }
}

// Run if executed directly
// @ts-ignore - require.main is only available in Node.js environments
const isMainModule = typeof require !== "undefined" && 
  // @ts-ignore
  typeof module !== "undefined" && 
  // @ts-ignore
  (require as any).main === module;

if (isMainModule) {
  runDemos().catch(console.error);
}

export { demoBasicLogin, demoSessionMonitoring, demoAnomalyDetection, demoErrorHandling };
