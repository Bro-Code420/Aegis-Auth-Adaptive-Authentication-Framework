"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useOrganization } from "@/components/providers/organization-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { MoreHorizontal, Plus, Search, ArrowUpDown, X, ChevronRight, ArrowRight, ArrowLeft, ExternalLink, Copy, Check, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

type Application = {
  _id: Id<"applications">
  name: string
  environment: string
  riskPolicyId: Id<"riskPolicies">
  status: string
  type: string
  redirectUri?: string
  appId: string
  apiKey: string
  secret: string
}

function AppDetailsContent({
  app,
  onClose,
  title,
  isSuccess = false,
  handleCopy,
  copying
}: {
  app: Application | null,
  onClose: () => void,
  title: string,
  isSuccess?: boolean,
  handleCopy: (text: string, id: string) => void,
  copying: string | null
}) {
  if (!app) return null;

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader className="gap-1 pt-2">
        <DialogTitle className="text-2xl font-bold tracking-tight">{title}</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {isSuccess ? "Your application is ready. Use these credentials to integrate." : `Configuration details for ${app.name}.`}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-4">
        {[
          { label: "App Name", value: app.name, id: "name" },
          { label: "App ID", value: app.appId, id: "id" },
          { label: "API Key", value: app.apiKey, id: "key" },
          { label: "Secret", value: app.secret, id: "secret" },
          { label: "Base URL", value: process.env.NEXT_PUBLIC_AEGIS_BASE_URL || "https://aegis-auth-adaptive-authentication.onrender.com", id: "url" },
        ].map((field) => (
          <div key={field.id} className="group relative flex flex-col gap-1.5 border-l-2 border-primary/30 pl-4 py-1 hover:border-primary transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{field.label}</span>
            <div className="flex items-center justify-between gap-4">
              <code className="text-sm font-mono text-foreground break-all">{field.value}</code>
              <button
                onClick={() => handleCopy(field.value, field.id)}
                className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/10"
              >
                {copying === field.id ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/40 bg-secondary/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Next Steps</p>
        <ul className="flex flex-col gap-2.5 text-sm">
          <li className="flex gap-2.5 items-start">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20 mt-0.5">1</span>
            <span className="text-muted-foreground">Install the AegisAuth SDK in your project</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20 mt-0.5">2</span>
            <span className="text-muted-foreground">Add API key and Secret to environment variables</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20 mt-0.5">3</span>
            <span className="text-muted-foreground">Enable AegisAuth middleware in your application</span>
          </li>
        </ul>
      </div>

      <DialogFooter className="gap-3 sm:gap-4 border-t border-border/40 pt-6">
        {isSuccess ? (
          <>
            <Button
              variant="outline"
              className="rounded-xl px-6 h-11 gap-2 border-border/60 hover:bg-secondary/50 font-medium"
              asChild
            >
              <a href="https://docs.aegisauth.com" target="_blank" rel="noopener noreferrer">
                View Documentation
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button
              onClick={onClose}
              className="rounded-xl px-6 h-11 gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Go to Dashboard
            </Button>
          </>
        ) : (
          <Button
            onClick={onClose}
            className="w-full rounded-xl px-6 h-11 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Close
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

type SortField = "name" | "environment" | "status" | null
type SortDir = "asc" | "desc"

export default function ApplicationsPage() {
  const { activeOrganization } = useOrganization()
  const router = useRouter()
  
  const apps = useQuery(
    api.applications.getApplicationsByOrg, 
    activeOrganization ? { organizationId: activeOrganization } : "skip"
  )
  const policies = useQuery(api.riskPolicies.list, {})
  const organizations = useQuery(api.organizations.getUserOrganizations, {})
  const createApp = useMutation(api.applications.create)
  const updateApp = useMutation(api.applications.update)
  const toggleStatus = useMutation(api.applications.toggleStatus)
  const deleteApp = useMutation(api.applications.remove)

  const ensureOrg = useMutation(api.organizations.ensureUserOrganization)
  const seedPolicies = useMutation(api.riskPolicies.seed)

  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [addOpen, setAddOpen] = useState(false)
  const [addStep, setAddStep] = useState(1)
  const [newApp, setNewApp] = useState({
    name: "",
    environment: "Production",
    riskPolicyId: "" as Id<"riskPolicies">,
    type: "Web App",
    redirectUri: "",
    mlEnhancement: true,
    organizationId: "" as Id<"organizations">
  })

  // Auto-fill organization and risk policy if empty
  useEffect(() => {
    if (addOpen) {
      const targetOrg = newApp.organizationId || activeOrganization || organizations?.[0]?._id
      const targetPolicy = newApp.riskPolicyId || policies?.[0]?._id
      if (targetOrg && targetOrg !== newApp.organizationId) {
        setNewApp(prev => ({ ...prev, organizationId: targetOrg as Id<"organizations"> }))
      }
      if (targetPolicy && targetPolicy !== newApp.riskPolicyId) {
        setNewApp(prev => ({ ...prev, riskPolicyId: targetPolicy as Id<"riskPolicies"> }))
      }
    }
  }, [addOpen, activeOrganization, organizations, policies, newApp.organizationId, newApp.riskPolicyId])

  const [editOpen, setEditOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteAppModal, setDeleteAppModal] = useState<Application | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [editedAppData, setEditedAppData] = useState({ name: "", environment: "", riskPolicyId: "" as Id<"riskPolicies"> })
  const [copying, setCopying] = useState<string | null>(null)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    if (!apps) return []
    let data = [...apps]
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.environment.toLowerCase().includes(q)
      )
    }
    if (sortField) {
      data.sort((a, b) => {
        let cmp = 0
        if (sortField === "name") cmp = a.name.localeCompare(b.name)
        else if (sortField === "environment") cmp = a.environment.localeCompare(b.environment)
        else if (sortField === "status") cmp = a.status.localeCompare(b.status)
        return sortDir === "desc" ? -cmp : cmp
      })
    }
    return data as Application[]
  }, [apps, search, sortField, sortDir])

  async function handleAddApp() {
    if (!newApp.name.trim()) return

    try {
      let targetOrg = newApp.organizationId || activeOrganization || organizations?.[0]?._id
      if (!targetOrg) {
        targetOrg = (await ensureOrg({})) as Id<"organizations">
      }

      let targetPolicy = newApp.riskPolicyId || policies?.[0]?._id
      if (!targetPolicy) {
        await seedPolicies({})
        const seededList = await policies
        targetPolicy = seededList?.[0]?._id || targetPolicy
      }

      const createdApp = await createApp({
        name: newApp.name.trim(),
        environment: newApp.environment,
        riskPolicyId: targetPolicy as Id<"riskPolicies">,
        type: newApp.type,
        redirectUri: newApp.redirectUri || undefined,
        mlEnhancement: newApp.mlEnhancement,
        organizationId: targetOrg as Id<"organizations">
      })
      setSelectedApp(createdApp as any)
      setAddStep(3)
      toast.success(`${newApp.name} has been successfully registered.`)
    } catch (error) {
      toast.error("Failed to create application")
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopying(id)
    setTimeout(() => setCopying(null), 2000)
    toast.success("Copied to clipboard")
  }

  function handleOpenDetails(app: Application) {
    setSelectedApp(app)
    setDetailsOpen(true)
  }

  async function handleToggleStatus(id: Id<"applications">, name: string) {
    try {
      await toggleStatus({ id })
      toast.info(`${name} status updated.`)
    } catch (error) {
      toast.error("Failed to update status")
    }
  }

  function handleOpenEdit(app: Application) {
    setEditingApp(app)
    setEditedAppData({
      name: app.name,
      environment: app.environment,
      riskPolicyId: app.riskPolicyId
    })
    setEditOpen(true)
  }

  async function handleUpdateApp() {
    if (!editingApp || !editedAppData.name.trim()) return
    try {
      await updateApp({
        id: editingApp._id,
        name: editedAppData.name.trim(),
        environment: editedAppData.environment,
        riskPolicyId: editedAppData.riskPolicyId
      })
      toast.success(`Configuration for ${editedAppData.name} updated.`)
      setEditOpen(false)
      setEditingApp(null)
    } catch (error) {
      toast.error("Failed to update application")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xl font-bold tracking-tight">AegisAuth</span>
          <p className="text-sm text-muted-foreground">
            Manage connected applications and their security configurations.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) {
            setAddStep(1)
            setNewApp({
              name: "",
              environment: "Production",
              riskPolicyId: "" as Id<"riskPolicies">,
              type: "Web App",
              redirectUri: "",
              mlEnhancement: true,
              organizationId: "" as Id<"organizations">
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-lg">
              <Plus className="size-4" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border-border/50 shadow-2xl">
            {addStep === 1 ? (
              <>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground/60">
                  <span>Applications</span>
                  <ChevronRight className="size-3" />
                  <span className="text-foreground">Add New Application</span>
                </div>

                <DialogHeader className="gap-1 pt-2">
                  <DialogTitle className="text-2xl font-bold tracking-tight">Add New Application</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Register a new application with AegisAuth for risk monitoring.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-6">
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="app-name" className="text-sm font-semibold">Application Name</Label>
                    <input
                      id="app-name"
                      type="text"
                      value={newApp.name}
                      onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                      placeholder="e.g. My Web App"
                      className="h-11 rounded-xl border border-border bg-secondary/30 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <Label className="text-sm font-semibold">Application Type</Label>
                    <RadioGroup
                      value={newApp.type}
                      onValueChange={(v) => setNewApp({ ...newApp, type: v })}
                      className="flex flex-col gap-3"
                    >
                      {["Web App", "Mobile App", "Backend API"].map((type) => (
                        <div key={type} className="flex items-center gap-3">
                          <RadioGroupItem value={type} id={`type-${type}`} className="size-4 border-primary/40 text-primary" />
                          <Label htmlFor={`type-${type}`} className="text-sm font-medium cursor-pointer">{type}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-4">
                    <Label className="text-sm font-semibold">Environment</Label>
                    <RadioGroup
                      value={newApp.environment}
                      onValueChange={(v) => setNewApp({ ...newApp, environment: v })}
                      className="flex flex-col gap-3"
                    >
                      {["Development", "Production"].map((env) => (
                        <div key={env} className="flex items-center gap-3">
                          <RadioGroupItem value={env} id={`env-${env}`} className="size-4 border-primary/40 text-primary" />
                          <Label htmlFor={`env-${env}`} className="text-sm font-medium cursor-pointer">{env}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label htmlFor="redirect-uri" className="text-sm font-semibold">Redirect URL (Optional)</Label>
                    <input
                      id="redirect-uri"
                      type="text"
                      value={newApp.redirectUri}
                      onChange={(e) => setNewApp({ ...newApp, redirectUri: e.target.value })}
                      placeholder="https://example.com/callback"
                      className="h-11 rounded-xl border border-border bg-secondary/30 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Organization</Label>
                      {(!organizations || organizations.length === 0) && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const orgId = await ensureOrg({})
                              if (orgId) {
                                setNewApp(prev => ({ ...prev, organizationId: orgId as Id<"organizations"> }))
                                toast.success("Workspace created successfully!")
                              }
                            } catch (e) {
                              toast.error("Failed to create workspace")
                            }
                          }}
                          className="text-xs text-primary hover:underline font-semibold"
                        >
                          + Auto-create Workspace
                        </button>
                      )}
                    </div>
                    <Select
                      value={newApp.organizationId || (organizations?.[0]?._id ?? "")}
                      onValueChange={(v) => setNewApp({ ...newApp, organizationId: v as Id<"organizations"> })}
                    >
                      <SelectTrigger className="h-11 rounded-xl border border-border bg-secondary/30 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all">
                        <SelectValue placeholder={organizations?.length ? "Select organization" : "Primary Workspace (Auto-provisioned)"} />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations?.map((org: any) => (
                          <SelectItem key={org._id} value={org._id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="gap-3 sm:gap-4 border-t border-border/40 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                    className="rounded-xl px-6 h-11 border-border/60 hover:bg-secondary/50 font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!newApp.organizationId) {
                        try {
                          const orgId = await ensureOrg({})
                          if (orgId) {
                            setNewApp(prev => ({ ...prev, organizationId: orgId as Id<"organizations"> }))
                          }
                        } catch (e) {}
                      }
                      setAddStep(2)
                    }}
                    disabled={!newApp.name.trim()}
                    className="rounded-xl px-6 h-11 gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Continue
                    <ArrowRight className="size-4" />
                  </Button>
                </DialogFooter>
              </>
            ) : addStep === 2 ? (
              <>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground/60">
                  <span>Applications</span>
                  <ChevronRight className="size-3" />
                  <span className="text-foreground">Assign Risk Policy</span>
                </div>

                <DialogHeader className="gap-1 pt-2">
                  <DialogTitle className="text-2xl font-bold tracking-tight">Assign Risk Policy</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Configure the risk model and thresholds for {newApp.name}.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-8 py-8">
                  <div className="flex flex-col gap-4">
                    <Label className="text-sm font-semibold">Select Risk Model</Label>
                    <RadioGroup
                      value={newApp.riskPolicyId}
                      onValueChange={(v) => setNewApp({ ...newApp, riskPolicyId: v as Id<"riskPolicies"> })}
                      className="flex flex-col gap-4"
                    >
                      {policies?.map((policy: any) => (
                        <div key={policy._id} className="flex items-center gap-3">
                          <RadioGroupItem value={policy._id} id={`policy-${policy._id}`} className="size-4 border-primary/40 text-primary" />
                          <Label htmlFor={`policy-${policy._id}`} className="text-sm font-medium cursor-pointer">{policy.name}</Label>
                        </div>
                      ))}
                      {policies?.length === 0 && (
                        <p className="text-sm text-muted-foreground">No policies found. Please create one.</p>
                      )}
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-4">
                    <Label className="text-sm font-semibold">Risk Thresholds</Label>
                    <div className="grid grid-cols-2 gap-y-3 px-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Low</span>
                        <span>{"< 30"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Medium</span>
                        <span>{"30 - 60"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">High</span>
                        <span>{"60 - 80"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Critical</span>
                        <span>{"> 80"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-secondary/20 p-4 border border-border/40">
                    <div className="flex flex-col gap-1">
                      <Label className="text-sm font-semibold">Enable ML Enhancement</Label>
                      <p className="text-xs text-muted-foreground">Continuous learning risk profiles</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{newApp.mlEnhancement ? "ON" : "OFF"}</span>
                      <Switch
                        checked={newApp.mlEnhancement}
                        onCheckedChange={(v) => setNewApp({ ...newApp, mlEnhancement: v })}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-3 sm:gap-4 border-t border-border/40 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setAddStep(1)}
                    className="rounded-xl px-6 h-11 gap-2 border-border/60 hover:bg-secondary/50 font-medium"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleAddApp}
                    className="rounded-xl px-6 h-11 gap-2 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Continue
                    <ArrowRight className="size-4" />
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <AppDetailsContent
                app={selectedApp}
                onClose={() => setAddOpen(false)}
                title="Application Created Successfully"
                isSuccess={true}
                handleCopy={handleCopy}
                copying={copying}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md bg-card border-border/50 shadow-2xl">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground/60">
            <span>Applications</span>
            <ChevronRight className="size-3" />
            <span className="text-foreground">Application Details</span>
          </div>
          <AppDetailsContent
            app={selectedApp}
            onClose={() => setDetailsOpen(false)}
            title="Application Details"
            handleCopy={handleCopy}
            copying={copying}
          />
        </DialogContent>
      </Dialog>

      <Card className="rounded-xl border-border/50 bg-card">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search applications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("name")}>
                    App Name <ArrowUpDown className="size-3" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("environment")}>
                    Environment <ArrowUpDown className="size-3" />
                  </Button>
                </TableHead>
                <TableHead>Risk Policy</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-3 text-muted-foreground hover:text-foreground" onClick={() => toggleSort("status")}>
                    Status <ArrowUpDown className="size-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No applications found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((app) => (
                  <TableRow 
                    key={app._id} 
                    className="border-border/30 cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => router.push(`/dashboard/applications/${app._id}`)}
                  >
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          app.environment === "Production"
                            ? "border-success/20 bg-success/10 text-success"
                            : app.environment === "Staging"
                              ? "border-warning/20 bg-warning/10 text-warning"
                              : "border-muted-foreground/20 bg-muted text-muted-foreground"
                        }
                      >
                        {app.environment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {policies?.find(p => p._id === app.riskPolicyId)?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${app.status === "Active" ? "bg-success" : "bg-muted-foreground"
                            }`}
                        />
                        <span className="text-sm text-muted-foreground">{app.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Open actions menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleOpenDetails(app)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleOpenEdit(app)}>
                            Edit Configuration
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => toast.promise(new Promise(r => setTimeout(r, 1000)), {
                            loading: 'Retrieving API keys...',
                            success: 'API keys retrieved successfully.',
                            error: 'Failed to retrieve API keys.',
                          })}>
                            Manage API Keys
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleToggleStatus(app._id, app.name)}
                          >
                            {app.status === "Active" ? "Disable Application" : "Enable Application"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => setDeleteAppModal(app)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete Application
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Edit Application</DialogTitle>
            <DialogDescription>
              Update configuration for {editingApp?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Application Name</Label>
              <input
                id="edit-name"
                type="text"
                value={editedAppData.name}
                onChange={(e) => setEditedAppData({ ...editedAppData, name: e.target.value })}
                className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Environment</Label>
              <Select value={editedAppData.environment} onValueChange={(v) => setEditedAppData({ ...editedAppData, environment: v })}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Staging">Staging</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Risk Policy</Label>
              <Select value={editedAppData.riskPolicyId} onValueChange={(v) => setEditedAppData({ ...editedAppData, riskPolicyId: v as Id<"riskPolicies"> })}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {policies?.map(p => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateApp} disabled={!editedAppData.name.trim()}>
              Update Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAppModal} onOpenChange={(open) => !open && setDeleteAppModal(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" />
              Delete Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{deleteAppModal?.name}</strong>?
              This action cannot be undone and will permanently delete this application, its API keys, security policies, and all associated session logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault()
                if (!deleteAppModal) return
                setIsDeleting(true)
                try {
                  await deleteApp({ id: deleteAppModal._id })
                  toast.success(`Application "${deleteAppModal.name}" has been deleted.`)
                  setDeleteAppModal(null)
                } catch (err) {
                  toast.error("Failed to delete application.")
                } finally {
                  setIsDeleting(false)
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
