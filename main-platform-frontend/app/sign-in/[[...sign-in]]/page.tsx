import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft } from "lucide-react"

export default function SignInPage() {
    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4">
            {/* Background Decorative Element */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.25_0.08_195),_transparent_70%)]" />

            <div className="absolute top-8 left-8 z-50">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground transition-colors">
                    <Link href="/" className="flex items-center gap-2">
                        <ArrowLeft className="size-4" />
                        Back
                    </Link>
                </Button>
            </div>

            <div className="relative w-full max-w-md">
                <div className="mb-10 flex flex-col items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 transition-all group-hover:scale-105 group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                            <Shield className="size-7 text-primary" />
                        </div>
                        <span className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">AegisAuth</span>
                    </Link>
                </div>

                <div className="relative border-border/50 bg-card/60 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden p-1 ring-1 ring-white/5">
                    <div className="p-8 text-center bg-gradient-to-b from-white/[0.02] to-transparent">
                        <h2 className="text-3xl font-bold mb-2 tracking-tight">Welcome Back</h2>
                        <p className="text-muted-foreground/80 text-sm mb-6 font-medium">
                            Enter your credentials to access your dashboard
                        </p>
                    </div>

                    <div className="flex justify-center pb-8 px-6">
                        <SignIn
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    card: "bg-transparent border-none shadow-none p-0",
                                    headerTitle: "hidden",
                                    headerSubtitle: "hidden",
                                    socialButtonsBlockButton: "border-border/60 hover:bg-secondary/50 text-foreground",
                                    dividerLine: "bg-border/40",
                                    dividerText: "text-muted-foreground text-xs uppercase bg-transparent",
                                    formFieldLabel: "text-foreground",
                                    formFieldInput: "h-10 rounded-lg border-border bg-secondary/30 text-sm focus:border-primary/50 focus:ring-primary/50",
                                    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-10 w-full",
                                    footerActionText: "text-muted-foreground",
                                    footerActionLink: "text-primary hover:underline",
                                    identityPreviewText: "text-foreground",
                                    identityPreviewEditButtonIcon: "text-primary"
                                }
                            }}
                        />
                    </div>
                </div>

                <p className="mt-8 px-8 text-center text-xs text-muted-foreground/60">
                    By clicking continue, you agree to our{" "}
                    <Link href="#" className="underline underline-offset-4 hover:text-primary">
                        Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="underline underline-offset-4 hover:text-primary">
                        Privacy Policy
                    </Link>
                    .
                </p>
            </div>
        </div>
    )
}
