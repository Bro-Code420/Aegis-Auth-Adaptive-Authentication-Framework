"use client"

import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { toast } from "sonner"

interface PricingCardProps {
    title: string
    price: string
    description: string
    features: string[]
    highlighted?: boolean
    buttonText?: string
}

export function PricingCard({
    title,
    price,
    description,
    features,
    highlighted = false,
    buttonText = "Select Plan",
}: PricingCardProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleCheckout = async () => {
        if (price === "$0" || price === "Custom") {
            toast("This plan does not require a payment method.")
            return
        }

        try {
            setIsLoading(true)
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ priceStr: price, planName: title }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong")
            }

            if (data.url) {
                window.location.href = data.url
            }
        } catch (error: any) {
            toast.error("Checkout failed: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card
            className={cn(
                "relative flex flex-col transition-all duration-300 hover:scale-[1.02]",
                highlighted
                    ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_30px_-5px_oklch(var(--primary)/0.2)]"
                    : "border-border/50 bg-card/50"
            )}
        >
            {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-emerald-950">
                    Most Popular
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription className="text-muted-foreground">{description}</CardDescription>
            </CardHeader>
            <CardContent className="grid flex-1 gap-6">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{price}</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <ul className="grid gap-3 text-sm">
                    {features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                            <Check className="size-4 text-emerald-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                <Button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className={cn(
                        "w-full rounded-xl transition-all",
                        highlighted
                            ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                            : "border-border/50 bg-secondary/50 hover:bg-secondary"
                    )}
                    variant={highlighted ? "default" : "outline"}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Redirecting..." : buttonText}
                </Button>
            </CardFooter>
        </Card>
    )
}
