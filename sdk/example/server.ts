/**
 * Express.js Example with AegisAuth Node.js Integration
 * Shows server-side risk assessment and middleware usage
 */

// import express from "express";
// import { AegisAuthNode, aegisMiddleware, requireLowRisk } from "@aegis/auth-sdk/node";

/**
 * Example Express server with AegisAuth integration
 * 
 * run with: npx ts-node example/server.ts
 */

// const app = express();

// // Initialize AegisAuth Node client
// const aegisConfig = {
//   apiKey: "your-api-key",
//   endpoint: "http://localhost:8000",
//   timeout: 10000,
//   retries: 1,
//   debug: true,
// };

// app.use(express.json());

// // Add AegisAuth middleware to all routes
// app.use(aegisMiddleware(aegisConfig));

// /**
//  * Login endpoint with risk assessment
//  */
// app.post("/api/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Validate credentials (simplified)
//     if (!email || !password) {
//       return res.status(400).json({ error: "Missing credentials" });
//     }

//     // Risk is already assessed by middleware
//     const risk = req.aegisRisk;

//     // Handle based on risk level
//     if (risk.risk_level === "CRITICAL") {
//       // Block login
//       return res.status(403).json({
//         error: "Login blocked",
//         message: "Suspicious activity detected. Contact support.",
//         riskLevel: risk.risk_level,
//       });
//     }

//     if (risk.risk_level === "HIGH") {
//       // Require MFA
//       return res.status(202).json({
//         status: "mfa_required",
//         message: "Please complete MFA verification",
//         sessionId: generateSessionId(),
//         riskLevel: risk.risk_level,
//       });
//     }

//     // Low/Medium risk - normal login
//     const user = await authenticateUser(email, password);

//     if (!user) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     return res.json({
//       success: true,
//       token: generateToken(user),
//       user: { id: user.id, email: user.email },
//       riskLevel: risk.risk_level,
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// /**
//  * Protected route requiring low risk
//  */
// const client = new AegisAuthNode(aegisConfig);
// app.get(
//   "/api/sensitive-data",
//   requireLowRisk(client),
//   (req, res) => {
//     res.json({
//       data: "sensitive information",
//       timestamp: new Date(),
//     });
//   }
// );

// /**
//  * Manual risk evaluation endpoint
//  */
// app.post("/api/assess-risk", async (req, res) => {
//   try {
//     const { userId, email } = req.body;

//     const assessment = await client.evaluateRisk({
//       userId,
//       email,
//       metadata: {
//         ipAddress: req.ip,
//         path: req.path,
//       },
//     });

//     res.json({
//       riskScore: assessment.risk_score,
//       riskLevel: assessment.risk_level,
//       components: assessment.components,
//     });
//   } catch (error) {
//     console.error("Risk assessment error:", error);
//     res.status(500).json({ error: "Risk assessment failed" });
//   }
// });

// /**
//  * Batch risk evaluation
//  */
// app.post("/api/batch-assess", async (req, res) => {
//   try {
//     const { users } = req.body; // Array of { userId, email }

//     const assessments = await client.evaluateRiskBatch(users);

//     res.json({
//       assessments: assessments.map((a) => ({
//         riskScore: a.risk_score,
//         riskLevel: a.risk_level,
//       })),
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Batch assessment failed" });
//   }
// });

// /**
//  * Utility functions (would be in separate file)
//  */
// function generateSessionId(): string {
//   return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
// }

// function generateToken(user: any): string {
//   // Simplified JWT generation
//   return Buffer.from(JSON.stringify({ sub: user.id, exp: Date.now() + 3600000 })).toString("base64");
// }

// async function authenticateUser(email: string, password: string): Promise<any> {
//   // Simplified user auth (would check database)
//   if (email === "user@example.com" && password === "password123") {
//     return { id: "user-123", email };
//   }
//   return null;
// }

// /**
//  * Start server
//  */
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`✅ AegisAuth-protected API running on http://localhost:${PORT}`);
//   console.log(`Backend endpoint: ${aegisConfig.endpoint}`);
// });

// Note: This file is meant to be studied, not run directly.
// In a real application, you would:
// 1. Install dependencies: npm install express
// 2. Uncomment the code above
// 3. Configure your MongoDB/database connection
// 4. Run: npx ts-node example/server.ts

export {};
