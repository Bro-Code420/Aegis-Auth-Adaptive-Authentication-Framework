"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Copy, Key, Check, Shield, Plug, ExternalLink } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import Link from "next/link"

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("AegisAuth Inc.")
  const [orgEmail, setOrgEmail] = useState("admin@aegisauth.io")
  const [timezone, setTimezone] = useState("UTC")
  const [saved, setSaved] = useState(false)

  // Live Convex data — fetches all apps tied to the logged-in Clerk user (no org required)
  const applications = useQuery(api.applications.list)
  const toggleStatus = useMutation(api.applications.toggleStatus)

  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  function handleSaveGeneral() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
    toast.success("Copied to clipboard")
  }

  // Static integrations (external tools — these don't have a Convex table yet)
  const integrations = [
    { name: "Slack", description: "Real-time security alerts in Slack channels", connected: false },
    { name: "PagerDuty", description: "Incident escalation for critical events", connected: false },
    { name: "Datadog", description: "Export risk metrics and monitoring data", connected: false },
    { name: "Splunk", description: "SIEM integration for security logs", connected: false },
    { name: "Okta", description: "SSO and identity provider federation", connected: false },
    { name: "AWS CloudWatch", description: "Cloud infrastructure monitoring", connected: false },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure platform settings and integrations.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-secondary">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="rounded-xl border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Organization Settings</CardTitle>
              <CardDescription>Manage your organization details and preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex max-w-md flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org-name" className="text-sm">Organization Name</Label>
                  <input
                    id="org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="org-email" className="text-sm">Admin Email</Label>
                  <input
                    id="org-email"
                    type="email"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="timezone" className="text-sm">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                      <SelectItem value="EST">EST (Eastern Standard Time)</SelectItem>
                      <SelectItem value="PST">PST (Pacific Standard Time)</SelectItem>
                      <SelectItem value="CET">CET (Central European Time)</SelectItem>
                      <SelectItem value="JST">JST (Japan Standard Time)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-fit gap-2 rounded-lg" size="sm" onClick={handleSaveGeneral}>
                  {saved ? <><Check className="size-4" /> Saved</> : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys — Live from Convex */}
        <TabsContent value="api-keys" className="mt-6">
          <Card className="rounded-xl border-border/50 bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">API Keys</CardTitle>
                  <CardDescription>
                    Live credentials from your registered applications. Updates instantly on any change.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="gap-2 rounded-lg">
                  <Link href="/dashboard/integrations">
                    <Key className="size-4" />
                    Manage Keys
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {applications === undefined && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                  <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-xs animate-pulse">Loading live API keys...</p>
                </div>
              )}
              {applications !== undefined && applications.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No applications registered. <Link href="/dashboard/applications" className="text-primary hover:underline">Create one</Link> to generate API keys.
                </div>
              )}
              <div className="flex flex-col gap-4">
                {applications?.map((app) => (
                  <div
                    key={app._id}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/20 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="size-4 text-muted-foreground" />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold">{app.name}</h3>
                          <Badge variant="outline" className="text-[10px]">{app.environment}</Badge>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {app.apiKey.substring(0, 14)}{"••••••••"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={
                          app.status === "Active"
                            ? "border-success/20 bg-success/10 text-success"
                            : "border-destructive/20 bg-destructive/10 text-destructive"
                        }
                      >
                        {app.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        onClick={() => handleCopy(app.apiKey, app._id)}
                      >
                        {copiedKey === app._id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={
                          app.status === "Active"
                            ? "text-xs text-muted-foreground hover:text-destructive"
                            : "text-xs text-muted-foreground hover:text-success"
                        }
                        onClick={() => {
                          toggleStatus({ id: app._id })
                          toast.success(`Key ${app.status === "Active" ? "revoked" : "restored"} for ${app.name}`)
                        }}
                      >
                        {app.status === "Active" ? "Revoke" : "Restore"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations — static third-party (no Convex table yet) */}
        <TabsContent value="integrations" className="mt-6">
          <Card className="rounded-xl border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-base">Third-Party Integrations</CardTitle>
              <CardDescription>Connect external services and tools to AegisAuth.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-start justify-between rounded-lg border border-border/30 bg-secondary/20 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Plug className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{integration.name}</span>
                        <span className="text-xs text-muted-foreground">{integration.description}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 rounded-lg text-xs gap-1.5"
                    >
                      Connect <ExternalLink className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
