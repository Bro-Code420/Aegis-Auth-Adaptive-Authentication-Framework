"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Save, Shield, Clock, Zap, Bell, Radio } from "lucide-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"

export default function AdminSettings() {
  const platformSettings = useQuery(api.admin.getPlatformSettings)
  const updateSettings = useMutation(api.admin.updatePlatformSettings)

  const [blockThreshold, setBlockThreshold] = useState<number>(85)
  const [mfaThreshold, setMfaThreshold] = useState<number>(60)
  const [sessionCheckInterval, setSessionCheckInterval] = useState<number>(30)
  const [tokenExpiry, setTokenExpiry] = useState<number>(60)
  const [continuousMonitoring, setContinuousMonitoring] = useState<boolean>(true)
  const [rateLimit, setRateLimit] = useState<number>(10000)
  const [emailWebhooks, setEmailWebhooks] = useState<boolean>(true)
  const [slackIntegration, setSlackIntegration] = useState<boolean>(false)

  useEffect(() => {
    if (platformSettings) {
      if (platformSettings.blockThreshold !== undefined) setBlockThreshold(platformSettings.blockThreshold)
      if (platformSettings.mfaThreshold !== undefined) setMfaThreshold(platformSettings.mfaThreshold)
      if (platformSettings.sessionCheckInterval !== undefined) setSessionCheckInterval(platformSettings.sessionCheckInterval)
      if (platformSettings.tokenExpiry !== undefined) setTokenExpiry(platformSettings.tokenExpiry)
      if (platformSettings.continuousMonitoring !== undefined) setContinuousMonitoring(platformSettings.continuousMonitoring)
      if (platformSettings.rateLimit !== undefined) setRateLimit(platformSettings.rateLimit)
      if (platformSettings.emailWebhooks !== undefined) setEmailWebhooks(platformSettings.emailWebhooks)
      if (platformSettings.slackIntegration !== undefined) setSlackIntegration(platformSettings.slackIntegration)
    }
  }, [platformSettings])

  const handleSave = async () => {
    try {
      await updateSettings({
        blockThreshold,
        mfaThreshold,
        sessionCheckInterval,
        tokenExpiry,
        continuousMonitoring,
        rateLimit,
        emailWebhooks,
        slackIntegration,
      })
      toast.success("Platform settings saved and applied in real-time!")
    } catch (err: any) {
      toast.error(err.message || "Failed to save platform settings")
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground mt-1">Global security policies, telemetry parameters, and administrative controls.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <Radio className="size-3 text-emerald-400 animate-pulse" />
          <span>Sync Active</span>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Security Thresholds */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="size-5 text-emerald-400" />
              Security Thresholds
            </CardTitle>
            <CardDescription className="text-xs">Configure how the state machine reacts to calculated ML risk scores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Default Block Threshold</Label>
                <span className="font-mono text-emerald-400 font-bold">{blockThreshold}%</span>
              </div>
              <Slider 
                value={[blockThreshold]} 
                onValueChange={(val) => setBlockThreshold(val[0])}
                max={100} 
                step={1} 
                className="py-2" 
              />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Any session above this score is automatically blocked or contained.</p>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <Label>MFA Challenge Threshold</Label>
                <span className="font-mono text-yellow-400 font-bold">{mfaThreshold}%</span>
              </div>
              <Slider 
                value={[mfaThreshold]} 
                onValueChange={(val) => setMfaThreshold(val[0])}
                max={100} 
                step={1} 
                className="py-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Interval */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="size-5 text-emerald-400" />
              Monitoring Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Session Check Interval (sec)</Label>
                <Input 
                  type="number" 
                  value={sessionCheckInterval} 
                  onChange={(e) => setSessionCheckInterval(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Token Expiry (minutes)</Label>
                <Input 
                  type="number" 
                  value={tokenExpiry} 
                  onChange={(e) => setTokenExpiry(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="space-y-0.5">
                <Label>Continuous Monitoring</Label>
                <p className="text-xs text-muted-foreground">Enable real-time telemetry streaming for all active sessions.</p>
              </div>
              <Switch 
                checked={continuousMonitoring} 
                onCheckedChange={setContinuousMonitoring}
              />
            </div>
          </CardContent>
        </Card>

        {/* API & Rate Limits */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Zap className="size-5 text-emerald-400" />
              API & Rate Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Global Rate Limit (req/min)</Label>
              <Input 
                type="number" 
                value={rateLimit} 
                onChange={(e) => setRateLimit(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bell className="size-5 text-emerald-400" />
              Alert Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Critical Threat Email Webhooks</Label>
                <p className="text-xs text-muted-foreground">Receive instant alert payloads on high severity security incidents.</p>
              </div>
              <Switch 
                checked={emailWebhooks} 
                onCheckedChange={setEmailWebhooks}
              />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="space-y-0.5">
                <Label>Slack Integration</Label>
                <p className="text-xs text-muted-foreground">Forward SOC channel alerts to connected workspace.</p>
              </div>
              <Switch 
                checked={slackIntegration} 
                onCheckedChange={setSlackIntegration}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8">
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  )
}
