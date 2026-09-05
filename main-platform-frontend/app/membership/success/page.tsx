"use client";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function SuccessPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Upgrade the demo user to Pro after payment Success
        localStorage.setItem("aegis_plan", "Pro");
    }, []);

    if (!mounted) return null;
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-md mx-auto text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight">Payment Successful!</h1>
            
            <p className="text-muted-foreground text-lg">
                Your payment is done. Your benefits are now active. Enjoy your upgraded experience with AegisAuth.
            </p>
            
            <div className="pt-8">
                <Link href="/membership">
                    <Button className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400 rounded-xl" size="lg">
                        Return to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
}
