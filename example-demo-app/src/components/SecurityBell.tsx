"use client";

import { useEffect, useState } from "react";
import { ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSecurityAlerts } from "@/actions/user.action";
import { formatDistanceToNow } from "date-fns";

interface SecurityAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export default function SecurityBell() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = async () => {
    const data = await getSecurityAlerts();
    setAlerts(data as any); // Cast as any because the server action return type might be slightly different in the client bundle
    setUnreadCount((data as any).filter((a: SecurityAlert) => !a.isRead).length);
  };

  useEffect(() => {
    // Initial fetch
    fetchAlerts();

    // Option A: Real-time Polling (Every 10 seconds for demo)
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <ShieldAlertIcon className="h-5 w-5 text-red-500 animate-pulse" />
          ) : (
            <ShieldCheckIcon className="h-5 w-5 text-green-500" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          Security Alerts
          {unreadCount > 0 && <span className="text-xs text-red-500 font-normal">Action Required</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Your account is secure.</div>
        ) : (
          alerts.map((alert) => (
            <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-1 p-3">
              <div className="flex w-full justify-between items-center">
                <span className={`text-xs font-bold ${alert.severity === "CRITICAL" ? "text-red-600" : "text-amber-600"}`}>
                  {alert.type}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(alert.createdAt))} ago
                </span>
              </div>
              <p className="text-sm line-clamp-2">{alert.message}</p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
