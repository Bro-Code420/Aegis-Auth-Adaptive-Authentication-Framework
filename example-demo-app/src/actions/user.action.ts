"use server";

import prisma from "@/lib/prisma";
import "@/lib/aegis"; // Import to ensure AegisAuth is initialized on the server
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs"; 
import { getCurrentUser, logout, signup, login } from "@devanshthaware/aegis-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface AegisUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Syncs the AegisAuth user with our Prisma database.
 * If user doesn't exist, it creates one.
 */
export async function syncAegisUser(aegisUser: AegisUser) {
  if (!aegisUser) return null;

  try {
    const user = await (prisma as any).user.upsert({
      where: { email: aegisUser.email },
      update: {
        name: aegisUser.name,
      },
      create: {
        email: aegisUser.email,
        username: aegisUser.email.split("@")[0], // Fallback username
        name: aegisUser.name,
        passwordHash: "", // Placeholder for externally managed users
      },
    });

    return user;
  } catch (error) {
    console.error("Error in syncAegisUser:", error);
    return null;
  }
}

/**
 * Returns the current authenticated user's database ID.
 * Resolves from AegisAuth session.
 */
export async function getDbUserId(): Promise<string | null> {
  try {
    // 1. Check for manual override (dev only)
    const envUserId = process.env.CURRENT_USER_ID;
    if (envUserId) return envUserId;

    // 2. Restore session from direct auth cookies
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("aegis_user_id")?.value;
    if (userIdCookie) return userIdCookie;

    const emailCookie = cookieStore.get("aegis_user_email")?.value;
    if (emailCookie) {
      const user = await prisma.user.findUnique({
        where: { email: emailCookie },
        select: { id: true },
      });
      if (user?.id) return user.id;
    }

    // 3. Fallback: Query AegisAuth SDK
    try {
      const aegisUser = await getCurrentUser();
      if (aegisUser?.email) {
        const user = await prisma.user.findUnique({
          where: { email: aegisUser.email },
          select: { id: true },
        });
        return user?.id || null;
      }
    } catch {
      // SDK session check optional
    }

    return null;
  } catch (error) {
    console.error("Error in getDbUserId:", error);
    return null;
  }
}

/**
 * User Registration (Security Optimized)
 */
export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const username = formData.get("username") as string;

  if (!email || !password) return { success: false, error: "Email and password are required" };

  try {
    const targetUsername = username || email.split("@")[0];
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: targetUsername }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return { success: false, error: "An account with this email already exists. Please log in instead." };
      }
      return { success: false, error: "Username is already taken. Please pick another username." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await (prisma as any).user.create({
      data: {
        email,
        username: targetUsername,
        name: name || undefined,
        passwordHash,
      },
    });

    // Call AegisAuth SDK to track signup and return initial decision
    let aegisResponse: any = null;
    try {
      aegisResponse = await signup({
        email,
        name: name || undefined,
        metadata: { username: targetUsername }
      });
      console.log("Aegis signup response:", aegisResponse);
    } catch (aegisErr) {
      console.warn("Aegis signup bridge warning (continuing signup):", aegisErr);
    }

    // Store session and user cookies
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";
    cookieStore.set("aegis_user_id", user.id, { httpOnly: true, secure: isProd, path: "/" });
    cookieStore.set("aegis_user_email", user.email, { httpOnly: true, secure: isProd, path: "/" });

    if (aegisResponse?.sessionId) {
      cookieStore.set("aegis_session_id", aegisResponse.sessionId, { httpOnly: true, secure: isProd, path: "/" });
      if (aegisResponse.correlationId) {
        cookieStore.set("aegis_correlation_id", aegisResponse.correlationId, { httpOnly: true, secure: isProd, path: "/" });
      }
    }

    return { success: true, user: { id: user.id, email: user.email } };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, error: error?.message || "Failed to register user" };
  }
}

/**
 * User Login with Real-time Risk Tracking (Step 6 of guide)
 */
export async function loginUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { success: false, error: "Missing fields" };

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(user as any).passwordHash) {
      return { success: false, error: "Invalid credentials" };
    }

    const valid = await bcrypt.compare(password, (user as any).passwordHash);

    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    let status: "SUCCESS" | "FAILED" | "BLOCKED" = "SUCCESS";

    if (!valid) {
      riskLevel = "HIGH";
      status = "FAILED";
    }

    // Logic for Security Alert (Step 7)
    if (status === "FAILED") {
      try {
        await (prisma as any).securityAlert.create({
          data: {
            userId: user.id,
            type: "SUSPICIOUS_LOGIN",
            severity: "MEDIUM",
            message: `Failed login attempt for account ${email}`,
          },
        });
      } catch (alertErr) {
        console.warn("Security alert log error:", alertErr);
      }
    }

    // Store Login History (Step 6)
    try {
      await (prisma as any).loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: "127.0.0.1",
          device: "Web Browser",
          location: "India",
          status,
          riskLevel,
        },
      });
    } catch (historyErr) {
      console.warn("Login history log error:", historyErr);
    }

    if (!valid) return { success: false, error: "Invalid password or email" };

    // Call AegisAuth SDK to track login and get risk decision
    let aegisResponse: any = null;
    try {
      aegisResponse = await login({
        email,
        metadata: { timestamp: new Date().toISOString() }
      });
      console.log("Aegis login response:", aegisResponse);
    } catch (aegisErr: any) {
      console.warn("Aegis login SDK warning:", aegisErr);
      if (aegisErr?.code === "ACCESS_DENIED") {
        return { success: false, error: "Access blocked due to high security risk." };
      }
      if (aegisErr?.code === "MFA_REQUIRED") {
        return { success: false, error: "MFA Verification is required." };
      }
    }

    // Store session in cookies for persistence
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";
    cookieStore.set("aegis_user_id", user.id, { httpOnly: true, secure: isProd, path: "/" });
    cookieStore.set("aegis_user_email", user.email, { httpOnly: true, secure: isProd, path: "/" });

    if (aegisResponse?.sessionId) {
      cookieStore.set("aegis_session_id", aegisResponse.sessionId, { httpOnly: true, secure: isProd, path: "/" });
      if (aegisResponse.correlationId) {
        cookieStore.set("aegis_correlation_id", aegisResponse.correlationId, { httpOnly: true, secure: isProd, path: "/" });
      }
    }
    
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, error: error?.message || "Internal server error" };
  }
}

/**
 * Logout the user (AegisAuth session termination)
 */
export async function logoutUser() {
  try {
    await logout();
  } catch (error) {
    console.warn("Logout SDK error:", error);
  }
  const cookieStore = await cookies();
  cookieStore.delete("aegis_user_id");
  cookieStore.delete("aegis_user_email");
  cookieStore.delete("aegis_session_id");
  cookieStore.delete("aegis_correlation_id");
  revalidatePath("/");
  redirect("/login");
}

export async function getRandomUsers() {
  try {
    const userId = await getDbUserId();
    if (!userId) return [];

    const randomUsers = await prisma.user.findMany({
      where: {
        AND: [
          { NOT: { id: userId } },
          {
            NOT: {
              followers: {
                some: {
                  followerId: userId,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: 3,
    });

    return randomUsers;
  } catch (error) {
    console.log("Error fetching random users", error);
    return [];
  }
}

export async function toggleFollow(targetUserId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return;

    if (userId === targetUserId) throw new Error("You cannot follow yourself");

    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });
    } else {
      await prisma.$transaction([
        prisma.follows.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
        }),
        prisma.notification.create({
          data: {
            type: "FOLLOW",
            userId: targetUserId,
            creatorId: userId,
          },
        }),
      ]);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.log("Error in toggleFollow", error);
    return { success: false, error: "Error toggling follow" };
  }
}

/**
 * Fetch real-time security alerts for the current user
 */
export async function getSecurityAlerts() {
  const userId = await getDbUserId();
  if (!userId) return [];

  return (prisma as any).securityAlert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
