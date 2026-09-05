"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

import { useOrganization } from "@/components/providers/organization-provider"

export function ProjectInfoCard() {
    const { activeOrganization } = useOrganization()
    const [showKey, setShowKey] = useState(false)
    const applications = useQuery(
      api.applications.getApplicationsByOrg,
      activeOrganization ? { organizationId: activeOrganization } : "skip"
    )
    
    // Use first application as the primary project
    const app = applications?.[0]

    const maskKey = (key: string) => {
        return showKey ? key : "••••••••••••••••"
    }

    return (
        <Card className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base font-semibold">Project Information</CardTitle>
                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400">
                    {app?.status ?? "Loading..."}
                </Badge>
            </CardHeader>
            <CardContent>
                {!applications ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">Loading project info...</div>
                ) : !app ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">No applications found. Create one to get started.</div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <div className="grid gap-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Project Name</span>
                                <span className="font-medium text-sm">{app.name}</span>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">App ID</span>
                                <span className="font-mono text-sm">{app.appId}</span>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">API Key</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm bg-secondary/50 px-2 py-1 rounded border border-border/50 min-w-[180px]">
                                        {maskKey(app.apiKey)}
                                    </span>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setShowKey(!showKey)}>
                                        {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="size-8"
                                        onClick={() => navigator.clipboard.writeText(app.apiKey)}
                                    >
                                        <Copy className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center items-end gap-2">
                            <div className="space-y-2 text-right">
                                <div className="grid gap-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Environment</span>
                                    <span className="text-sm font-medium">{app.environment}</span>
                                </div>
                                <div className="grid gap-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Type</span>
                                    <span className="text-sm font-medium">{app.type}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mt-2">
                                <ShieldCheck className="size-4" />
                                {app.mlEnhancement ? "ML Enhanced" : "Standard Mode"}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
