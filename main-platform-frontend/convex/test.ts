import { query } from "./_generated/server";

export const testUserIsolation = query({
    args: {},
    handler: async (ctx) => {
        const apps = await ctx.db.query("applications").collect();
        const sessions = await ctx.db.query("sessions").collect();
        const activities = await ctx.db.query("activities").collect();
        
        return {
            totalApps: apps.length,
            appsByUserId: apps.reduce((acc, app) => {
                acc[app.userId] = (acc[app.userId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            totalSessions: sessions.length,
            sessionsByAppId: sessions.reduce((acc, session) => {
                acc[session.applicationId] = (acc[session.applicationId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
        };
    }
});
