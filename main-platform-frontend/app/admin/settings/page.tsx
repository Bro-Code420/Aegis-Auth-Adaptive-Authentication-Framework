"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Save, Shield, Clock, Zap, Bell } from "lucide-react"

export default function AdminSettings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">Global configuration and administrative controls.</p>
      </div>

      <div className="grid gap-6">
        {/* Security Thresholds */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5 text-emerald-400" />
              Security Thresholds
            </CardTitle>
            <CardDescription className="text-xs">Configure how the system reacts to risk scores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Default Block Threshold</Label>
                <span className="font-mono text-emerald-400 font-bold">85</span>
              </div>
              <Slider defaultValue={[85]} max={100} step={1} className="py-2" />
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Any session above this score is automatically blocked.</p>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <Label>MFA Challenge Threshold</Label>
                <span className="font-mono text-yellow-400 font-bold">60</span>
              </div>
              <Slider defaultValue={[60]} max={100} step={1} className="py-2" />
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Interval */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5 text-emerald-400" />
              Monitoring Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Session Check Interval (sec)</Label>
                <Input type="number" defaultValue={30} />
              </div>
              <div className="space-y-2">
                <Label>Token Expiry (minutes)</Label>
                <Input type="number" defaultValue={60} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="space-y-0.5">
                <Label>Continuous Monitoring</Label>
                <p className="text-xs text-muted-foreground">Enable real-time telemetry for all active sessions.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* API & Rate Limits */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-5 text-emerald-400" />
              API & Rate Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Global Rate Limit (req/min)</Label>
              <Input type="number" defaultValue={10000} />
            </div>
            <div className="space-y-2 pt-2">
              <Label>Burst Allowances</Label>
              <select className="w-full bg-background border border-border text-foreground rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500/20">
                <option>Conservative (5%)</option>
                <option>Standard (10%)</option>
                <option>Aggressive (25%)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-5 text-emerald-400" />
              Alert Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Critical Threat Email Webhooks</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Slack Integration</Label>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost">Discard</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8">
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  )
}
