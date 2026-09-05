"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LiveSessionsPanel } from "@/components/dashboard/live-sessions-panel"
import { AnalyticsPanel } from "@/components/dashboard/analytics-panel"
import { Activity, BarChart3, ShieldAlert } from "lucide-react"

export default function MonitoringPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Monitoring</h1>
        <p className="text-muted-foreground">Global security stream and analytical insights across all applications.</p>
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="bg-secondary/50 p-1 mb-8">
          <TabsTrigger value="live" className="gap-2 px-6 rounded-lg">
            <Activity className="size-4" />
            Live Stream
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 px-6 rounded-lg">
            <BarChart3 className="size-4" />
            Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-0 border-none p-0">
          <LiveSessionsPanel />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-0 border-none p-0">
          <AnalyticsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
