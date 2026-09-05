"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Key, 
  BookOpen, 
  Terminal, 
  ShieldCheck, 
  Code2, 
  ExternalLink, 
  Copy, 
  Check,
  RefreshCw,
  Trash2,
  Lock,
  Cpu,
  Globe,
  Zap,
  LayoutGrid,
  AlertTriangle
} from "lucide-react"
import { CodeBlock } from "@/components/docs/CodeBlock"
import { toast } from "sonner"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import Link from "next/link"

export default function IntegrationsPage() {
  const [copying, setCopying] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  // Fetch all user's applications directly — works with or without an organization
  const applications = useQuery(api.applications.list)
  const toggleStatus = useMutation(api.applications.toggleStatus)

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopying(id)
    setTimeout(() => setCopying(null), 2000)
    toast.success("Copied to clipboard")
  }

  function toggleReveal(id: string) {
    setRevealed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Manage your API credentials and explore developer documentation.</p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="bg-secondary/50 p-1 mb-8">
          <TabsTrigger value="api-keys" className="gap-2 px-6">
            <Key className="size-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="documentation" className="gap-2 px-6">
            <BookOpen className="size-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-0 border-none p-0">
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Project Credentials</h2>
                <p className="text-sm text-muted-foreground mt-1">Live API keys from your registered applications. All changes sync instantly.</p>
              </div>
              <Button asChild className="rounded-xl gap-2">
                <Link href="/dashboard/applications">
                  <LayoutGrid className="size-4" />
                  Manage Apps
                </Link>
              </Button>
            </div>

            {applications === undefined && (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm animate-pulse">Loading credentials...</p>
                </div>
              </div>
            )}

            {applications !== undefined && applications.length === 0 && (
              <Card className="rounded-2xl border-border/50 bg-card/30 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center p-16 text-center">
                  <div className="size-14 rounded-full bg-secondary/30 flex items-center justify-center mb-4 text-muted-foreground/30">
                    <AlertTriangle className="size-7" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">No Applications Found</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-[300px] leading-relaxed">
                    Create an application from the Applications page to generate API credentials.
                  </p>
                  <Button asChild className="mt-6 rounded-xl gap-2">
                    <Link href="/dashboard/applications">Create Application</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {applications?.map((app) => (
                <Card key={app._id} className="rounded-2xl border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-5">
                      {/* App Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Terminal className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{app.name}</span>
                              <Badge variant="outline" className={
                                app.status === "Active"
                                  ? "text-[10px] font-bold uppercase border-emerald-500/30 text-emerald-500 bg-emerald-500/5 px-2 py-0.5"
                                  : "text-[10px] font-bold uppercase border-destructive/30 text-destructive bg-destructive/5 px-2 py-0.5"
                              }>
                                {app.status}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase border-border/50 text-muted-foreground px-2 py-0.5">
                                {app.environment}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">App ID: {app.appId}</p>
                          </div>
                        </div>
                      </div>

                      {/* API Key Row */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">API Key</span>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/30 px-4 py-2.5 font-mono text-sm">
                            <span className="truncate text-xs">
                              {revealed.has(app._id + "-api") ? app.apiKey : app.apiKey.substring(0, 12) + "••••••••••••"}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => toggleReveal(app._id + "-api")}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {revealed.has(app._id + "-api") ? "HIDE" : "REVEAL"}
                              </button>
                              <button onClick={() => handleCopy(app.apiKey, app._id + "-api-copy")} className="text-muted-foreground hover:text-primary transition-colors">
                                {copying === app._id + "-api-copy" ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Secret Key Row */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Secret Key</span>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/30 px-4 py-2.5 font-mono text-sm">
                            <span className="truncate text-xs">
                              {revealed.has(app._id + "-secret") ? app.secret : "sk_live_••••••••••••••••"}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => toggleReveal(app._id + "-secret")}
                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {revealed.has(app._id + "-secret") ? "HIDE" : "REVEAL"}
                              </button>
                              <button onClick={() => handleCopy(app.secret, app._id + "-secret-copy")} className="text-muted-foreground hover:text-primary transition-colors">
                                {copying === app._id + "-secret-copy" ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* App URL & Allowed Origins */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Application URL</span>
                          <div className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/10 px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            <span className="truncate">{app.appUrl || "http://localhost:3000"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Allowed Origins</span>
                          <div className="flex flex-1 items-center justify-between gap-4 rounded-xl border border-border/50 bg-secondary/10 px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            <span className="truncate">{(app.allowedOrigins || ["http://localhost:3000"]).join(', ')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Created */}
                      <div className="flex items-center justify-between border-t border-border/30 pt-4 mt-1">
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(app._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={app.status === "Active" ? "text-xs text-destructive hover:text-destructive hover:bg-destructive/10" : "text-xs text-success hover:text-success hover:bg-success/10"}
                          onClick={() => {
                            toggleStatus({ id: app._id })
                            toast.success(`Application ${app.status === "Active" ? "deactivated" : "activated"} — key status updated instantly.`)
                          }}
                        >
                          {app.status === "Active" ? "Revoke Access" : "Restore Access"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-2xl border-border/50 bg-secondary/10">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <div className="size-10 rounded-full bg-secondary/30 flex items-center justify-center mb-3 text-muted-foreground/40">
                  <Lock className="size-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Zero-Trust Key Management</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[320px] leading-relaxed">
                  Revoking access deactivates the application instantly. All credentials are cryptographically scoped to their issuing application.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documentation" className="mt-0 border-none p-0">
          <div className="grid gap-12 lg:grid-cols-[240px_1fr]">
            <aside className="sticky top-24 h-fit hidden lg:block space-y-6">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Core Guides</h3>
                <nav className="flex flex-col gap-1">
                  {["Installation", "Quick Start", "Continuous Monitoring", "API Reference"].map((section) => (
                    <button key={section} className="text-left rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
                      {section}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">Advanced</h3>
                <nav className="flex flex-col gap-1">
                  {["Architecture", "Security", "Compliance"].map((section) => (
                    <button key={section} className="text-left rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
                      {section}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            <main className="space-y-12 pb-20">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-widest">
                  <Cpu className="size-3" />
                  Technical Brief
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Introduction</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  AegisAuth provides high-performance security infrastructure. Our platform focuses on adaptive risk assessment and behavioral telemetry to prevent sophisticated automated threats.
                </p>
              </section>

              <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <h3 className="text-xl font-bold">Integration SDK</h3>
                  <Badge variant="outline" className="border-primary/20 text-primary">v2.1.0-stable</Badge>
                </div>
                <div className="space-y-4 font-medium">
                  <p className="text-sm text-foreground">1. Install the core package</p>
                  <CodeBlock code="pnpm add @devanshthaware/aegis-auth"/>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">2. Initialize and assess risk</p>
                  <CodeBlock
                    language="typescript"
                    code={`import { AegisAuth } from "@aegis/auth-sdk";

const aegis = new AegisAuth({
  apiKey: "your_api_key_here",
  endpoint: "https://api.aegisauth.com",
  headers: {
    "x-origin": typeof window !== "undefined" ? window.location.origin : process.env.APP_URL || "unknown"
  }
});

const risk = await aegis.protectLogin({
  userId: "user_123",
  email: "dev@example.com"
});`}
                  />
                </div>
              </section>

              <div className="grid gap-6 sm:grid-cols-3">
                {[
                  { icon: Globe, title: "Latency", value: "< 45ms", desc: "Global edge" },
                  { icon: Zap, title: "Availability", value: "99.99%", desc: "Service level" },
                  { icon: ShieldCheck, title: "Compliance", value: "SOC2/GDPR", desc: "Certified" },
                ].map((stat) => (
                  <div key={stat.title} className="rounded-2xl border border-border/50 bg-card/30 p-4">
                    <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <stat.icon className="size-4" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.title}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground/60">{stat.desc}</p>
                  </div>
                ))}
              </div>
            </main>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
