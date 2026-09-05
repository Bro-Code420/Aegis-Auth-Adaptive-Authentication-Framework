"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function SecurityPopup() {
    const [dismissed, setDismissed] = useState(false);
    const router = useRouter();

    // Real-time Convex subscription: fetch the latest unread CRITICAL/HIGH alerts
    const alerts = useQuery(api.alerts.getAlerts, { limit: 10 });
    const markAllRead = useQuery === undefined ? undefined : undefined; // just for reference

    // Show only if there's an unread CRITICAL or HIGH severity alert and user hasn't dismissed this session
    const criticalAlert = alerts?.find(a => !a.isRead && (a.severity === "CRITICAL" || a.severity === "HIGH"));

    const isVisible = !!criticalAlert && !dismissed;

    const handleDismiss = () => {
        setDismissed(true);
    };

    const handleContactSupport = () => {
        setDismissed(true);
        router.push("/dashboard/support");
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5">
            <div className="relative overflow-hidden rounded-xl border border-destructive/50 bg-destructive/10 p-4 shadow-lg backdrop-blur-md">
                <button
                    onClick={handleDismiss}
                    className="absolute right-3 top-3 rounded-md text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                    <X className="size-4" />
                </button>
                <div className="flex gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                        <ShieldAlert className="size-5 text-destructive" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-semibold leading-none tracking-tight text-destructive">
                            {criticalAlert?.severity === "CRITICAL" ? "Critical Security Alert" : "High Risk Alert"}
                        </h4>
                        <p className="text-sm text-destructive/80">
                            {criticalAlert?.message ?? "Anomalous activity detected in your environment."}
                        </p>
                        <p className="text-[10px] text-destructive/60 font-mono">
                            App: {criticalAlert?.appName ?? "System"}
                        </p>
                        <div className="mt-4 flex gap-2">
                            <Button size="sm" variant="destructive" onClick={handleContactSupport}>
                                Contact Support
                            </Button>
                            <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={handleDismiss}>
                                Dismiss
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
