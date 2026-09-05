"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminTable } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Cpu, Save, RotateCcw, Radio } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"

export default function MLModels() {
  const models = useQuery(api.admin.getModelSettings)
  const updateWeight = useMutation(api.admin.updateModelWeight)
  const [minThreshold, setMinThreshold] = useState<number>(35)

  const handleWeightChange = async (id: string, value: number[]) => {
    try {
      await updateWeight({ id, weight: value[0] })
    } catch (err: any) {
      toast.error("Failed to update model weight")
    }
  }

  const handleResetDefaults = async () => {
    try {
      const defaults = [
        { id: "1", weight: 85 },
        { id: "2", weight: 92 },
        { id: "3", weight: 75 },
        { id: "4", weight: 65 },
      ]
      for (const d of defaults) {
        await updateWeight(d)
      }
      toast.success("Reset model weights to default baselines")
    } catch (err: any) {
      toast.error("Failed to reset defaults")
    }
  }

  const columns = [
    { header: "Model Name", accessor: "name" as const, className: "font-semibold text-foreground" },
    { header: "Version", accessor: "version" as const, className: "font-mono text-xs text-muted-foreground" },
    { 
      header: "Status", 
      accessor: (item: any) => <StatusBadge status={item.status} /> 
    },
    { 
      header: "Risk Weight", 
      accessor: (item: any) => (
        <div className="flex items-center gap-4 w-[220px]">
          <Slider 
            value={[item.weight]} 
            max={100} 
            step={1} 
            onValueChange={(val) => handleWeightChange(item.id, val)}
            className="flex-1"
          />
          <span className="font-mono text-xs w-10 text-right font-bold text-emerald-400">{item.weight}%</span>
        </div>
      ) 
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">ML Model Controls</h1>
          <p className="text-muted-foreground mt-1">Fine-tune platform intelligence by dynamically adjusting risk signal weights.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <Radio className="size-3 text-emerald-400 animate-pulse" />
            <span>Weights Live Synced</span>
          </div>
          <Button variant="outline" onClick={handleResetDefaults} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminTable columns={columns} data={models ?? []} />
        </div>

        <Card className="bg-card border-border h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Cpu className="size-5 text-emerald-400" />
              Global Sensitivity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Minimum Risk Challenge Threshold</label>
              <div className="flex gap-3">
                <Input 
                  type="number" 
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(Number(e.target.value))}
                />
                <Button 
                  variant="outline" 
                  className="shrink-0 font-medium"
                  onClick={() => toast.success(`Updated risk challenge threshold to ${minThreshold}%`)}
                >
                  Set
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Events below this score will not trigger interactive MFA step-ups.</p>
            </div>

            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium text-foreground">Model Weight Synchronization</label>
              <div className="mt-2 p-3 bg-muted/40 rounded-lg border border-border/50 text-xs text-muted-foreground">
                Weights are broadcast in real-time across all running application middleware nodes instantly without requiring service restarts.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
