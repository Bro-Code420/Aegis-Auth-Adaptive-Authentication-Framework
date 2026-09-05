"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RiskBadge } from "@/components/dashboard/risk-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useMutation, useQuery, useConvexAuth } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { useEffect } from "react"

export default function RiskPoliciesPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const [attempted, setAttempted] = useState(false)
  const policies = useQuery(api.riskPolicies.list)
  const createPolicy = useMutation(api.riskPolicies.create)
  const updatePolicy = useMutation(api.riskPolicies.update)
  const removePolicy = useMutation(api.riskPolicies.remove)
  const seedPolicies = useMutation(api.riskPolicies.seed)

  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"riskPolicies"> | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    low: "",
    medium: "",
    high: "",
    critical: "",
    mlEnabled: true,
  })

  useEffect(() => {
    // Only attempt to seed when authenticated, not loading, and we haven't already attempted this session
    if (isAuthenticated && !isLoading && !attempted && policies && policies.length === 0) {
      setAttempted(true)
      seedPolicies().catch((err) => {
        console.error("Failed to seed risk policies:", err)
      })
    }
  }, [isAuthenticated, isLoading, attempted, policies, seedPolicies])

  function openEdit(policy: any) {
    setForm({
      name: policy.name,
      description: policy.description,
      low: policy.thresholds.low,
      medium: policy.thresholds.medium,
      high: policy.thresholds.high,
      critical: policy.thresholds.critical,
      mlEnabled: policy.mlEnabled,
    })
    setEditingId(policy._id)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (editingId === null) return
    try {
      await updatePolicy({
        id: editingId,
        name: form.name,
        description: form.description,
        thresholds: { low: form.low, medium: form.medium, high: form.high, critical: form.critical },
        mlEnabled: form.mlEnabled,
      })
      toast.success("Policy updated successfully")
      setEditOpen(false)
      setEditingId(null)
    } catch (e) {
      toast.error("Failed to update policy")
    }
  }

  function openCreate() {
    setForm({ name: "", description: "", low: "0-30", medium: "31-60", high: "61-85", critical: "86-100", mlEnabled: true })
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!form.name.trim()) return
    try {
      await createPolicy({
        name: form.name.trim(),
        description: form.description,
        thresholds: { low: form.low, medium: form.medium, high: form.high, critical: form.critical },
        mlEnabled: form.mlEnabled,
      })
      toast.success("Policy created successfully")
      setCreateOpen(false)
    } catch (e) {
      toast.error("Failed to create policy")
    }
  }

  async function handleDelete(id: Id<"riskPolicies">) {
    if (!confirm("Are you sure you want to delete this policy?")) return
    try {
      await removePolicy({ id })
      toast.success("Policy deleted")
    } catch (e) {
      toast.error("Failed to delete policy")
    }
  }

  const policyForm = (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="policy-name">Policy Name</Label>
        <input
          id="policy-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Custom Risk Model"
          className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="policy-desc">Description</Label>
        <textarea
          id="policy-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["low", "medium", "high", "critical"] as const).map((level) => (
          <div key={level} className="flex flex-col gap-1.5">
            <Label className="capitalize text-xs">{level} Threshold</Label>
            <input
              type="text"
              value={form[level]}
              onChange={(e) => setForm({ ...form, [level]: e.target.value })}
              className="h-8 rounded-lg border border-border bg-secondary/50 px-3 text-sm font-mono text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col gap-0.5">
          <Label className="text-sm">Enable ML Enhancement</Label>
          <span className="text-xs text-muted-foreground">Use AI to dynamically adjust risk scoring</span>
        </div>
        <Switch checked={form.mlEnabled} onCheckedChange={(c) => setForm({ ...form, mlEnabled: c })} />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Risk Policies</h1>
          <p className="text-sm text-muted-foreground">
            Configure risk assessment models and threshold rules.
          </p>
        </div>
        <Button size="sm" className="gap-2 rounded-lg" onClick={openCreate}>
          <Plus className="size-4" />
          Create Policy
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {policies?.map((policy) => (
          <Card key={policy._id} className="rounded-xl border-border/50 bg-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">{policy.name}</CardTitle>
                  <CardDescription>{policy.description}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(policy)}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">Edit policy</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    onClick={() => handleDelete(policy._id)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete policy</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Risk Thresholds</span>
                  {policy.mlEnabled && (
                    <span className="text-xs text-primary font-bold uppercase tracking-wider">ML Enhanced</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(policy.thresholds) as [string, string][]).map(([level, range]) => (
                    <div key={level} className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/30 px-3 py-2">
                      <RiskBadge level={level as any} />
                      <span className="text-sm font-mono text-muted-foreground">{range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {policies?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border/40 rounded-2xl bg-secondary/10">
            No policies found. Click "Create Policy" to get started.
          </div>
        )}
      </div>

      {/* Edit Policy Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Edit Risk Policy</DialogTitle>
            <DialogDescription>
              Modify the risk thresholds and configuration for this policy.
            </DialogDescription>
          </DialogHeader>
          {policyForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Policy Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Create New Policy</DialogTitle>
            <DialogDescription>
              Define a new risk assessment model with custom thresholds.
            </DialogDescription>
          </DialogHeader>
          {policyForm}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>Create Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
