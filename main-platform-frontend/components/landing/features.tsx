import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Fingerprint,
  BrainCircuit,
  FileSearch,
  ShieldCheck,
  SlidersHorizontal,
  Server,
} from "lucide-react"

const features = [
  {
    icon: Fingerprint,
    title: "Continuous Authentication",
    description:
      "Go beyond login. Validate identity throughout the session using behavioral biometrics and contextual signals.",
  },
  {
    icon: BrainCircuit,
    title: "Hybrid AI Risk Engine",
    description:
      "Combine rule-based policies with ML models for precise, explainable risk scoring in real time.",
  },
  {
    icon: FileSearch,
    title: "Explainable Security Decisions",
    description:
      "Every risk score comes with clear reasoning. Auditable, transparent, and compliant by design.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Trust Architecture",
    description:
      "Never trust, always verify. Every request is evaluated against dynamic risk policies before access is granted.",
  },
  {
    icon: SlidersHorizontal,
    title: "Dynamic Privilege Control",
    description:
      "Automatically adjust user permissions based on real-time risk scores and session context.",
  },
  {
    icon: Server,
    title: "Enterprise-Ready Microservices",
    description:
      "Modular, scalable architecture built for high-throughput enterprise environments with 99.99% uptime.",
  },
]

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Intelligent Security at Every Layer
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Six pillars of adaptive authentication that protect your enterprise.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="group rounded-xl border-border/50 bg-card/50 transition-colors hover:border-primary/30 hover:bg-card"
          >
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                <feature.icon className="size-5" />
              </div>
              <CardTitle className="text-base">{feature.title}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {feature.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
