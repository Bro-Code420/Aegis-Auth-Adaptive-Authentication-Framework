import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Globe,
  BrainCircuit,
  Layers,
  ShieldAlert,
  Activity,
} from "lucide-react"

const modules = [
  {
    icon: Globe,
    title: "API Gateway",
    description:
      "Unified entry point with rate limiting, request validation, and intelligent routing across all services.",
    status: "Operational",
  },
  {
    icon: BrainCircuit,
    title: "ML Risk Engine",
    description:
      "Real-time ML inference pipeline combining behavioral analysis, device fingerprinting, and anomaly detection.",
    status: "Operational",
  },
  {
    icon: Layers,
    title: "Risk Aggregator",
    description:
      "Correlates signals from multiple sources into a unified, weighted risk score per session.",
    status: "Operational",
  },
  {
    icon: ShieldAlert,
    title: "Adaptive Response Controller",
    description:
      "Dynamically adjusts authentication requirements based on aggregated risk assessments and policy rules.",
    status: "Operational",
  },
  {
    icon: Activity,
    title: "Continuous Monitoring Engine",
    description:
      "Persistent session tracking with real-time behavioral drift detection and automated alerting.",
    status: "Operational",
  },
]

export function Architecture() {
  return (
    <section className="border-t border-border/40 bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Platform Architecture
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Five core modules that power enterprise-grade adaptive security.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <Card
              key={mod.title}
              className="group relative rounded-xl border-border/50 bg-card transition-colors hover:border-primary/30"
            >
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg border border-border/50 bg-secondary text-primary">
                  <mod.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{mod.title}</CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full bg-success" />
                  <span className="text-muted-foreground">{mod.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
