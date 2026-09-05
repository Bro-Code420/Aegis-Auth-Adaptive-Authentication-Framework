import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Polyfill/helper for secure PBKDF2 hashing using Web Crypto
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const hash = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        256
    );
    
    // Store as salt:hash
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    
    const hash = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        256
    );

    const computedHashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHashHex === hashHex;
}

export const signup = mutation({
    args: {
        email: v.string(),
        password: v.string(),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .first();
            
        if (existingUser) {
            throw new Error("User with this email already exists.");
        }

        const password_hash = await hashPassword(args.password);
        
        const userId = await ctx.db.insert("users", {
            email: args.email,
            password_hash,
            name: args.name,
            role: "USER", // Default role
            created_at: Date.now(),
            updated_at: Date.now(),
            failed_login_attempts: 0,
        });

        return { success: true, userId };
    }
});

export const login = mutation({
    args: {
        email: v.string(),
        password: v.string(),
        ip_address: v.optional(v.string()),
        device: v.optional(v.string()),
        location: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .first();

        // If user not found, track failed login history with a dummy user structure
        if (!user) {
            throw new Error("Invalid credentials");
        }

        // Account Lock check
        if (user.locked_until && user.locked_until > Date.now()) {
            throw new Error("Account temporarily locked due to multiple failed attempts.");
        }

        const isMatch = await verifyPassword(args.password, user.password_hash);
        
        if (!isMatch) {
            const newFails = (user.failed_login_attempts || 0) + 1;
            const patch: any = { failed_login_attempts: newFails };
            
            // Lock out for 15 mins after 5 failed attempts
            if (newFails >= 5) {
                patch.locked_until = Date.now() + 15 * 60 * 1000; 
            }
            
            await ctx.db.patch(user._id, patch);

            await ctx.db.insert("loginHistory", {
                user_id: user._id,
                email: args.email,
                ip_address: args.ip_address,
                device: args.device,
                location: args.location,
                status: "FAILED",
                created_at: Date.now()
            });

            throw new Error("Invalid credentials");
        }

        // Success Path
        await ctx.db.patch(user._id, {
            last_login_at: Date.now(),
            failed_login_attempts: 0,
            locked_until: undefined,
            updated_at: Date.now()
        });

        await ctx.db.insert("loginHistory", {
            user_id: user._id,
            email: args.email,
            ip_address: args.ip_address,
            device: args.device,
            location: args.location,
            status: "SUCCESS",
            created_at: Date.now()
        });

        // In a real OAuth flow you would issue a JWT session token here.
        // For Convex, you might return the internal user ID so the frontend can establish custom auth state.
        return { 
            success: true, 
            user: { 
                _id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role 
            }
        };
    }
});

// Admin support functions
export const listUsers = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        // NEVER expose password_hash
        return users.map(u => ({
            _id: u._id,
            email: u.email,
            name: u.name,
            role: u.role,
            created_at: u.created_at,
            last_login_at: u.last_login_at,
            locked_until: u.locked_until
        }));
    }
});

export const getLoginHistory = query({
    args: { userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        const userId = args.userId;
        if (userId) {
            return await ctx.db.query("loginHistory")
                .withIndex("by_user", q => q.eq("user_id", userId))
                .order("desc")
                .take(100);
        }
        return await ctx.db.query("loginHistory")
            .order("desc")
            .take(100);
    }
});

export const blockUser = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Example: block for 100 years
        await ctx.db.patch(args.userId, {
            locked_until: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
            updated_at: Date.now()
        });
        return { success: true };
    }
});
