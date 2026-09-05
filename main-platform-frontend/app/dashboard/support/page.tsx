"use client";

import { AlertTriangle, Info, LifeBuoy } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SupportChat } from "@/components/support/SupportChat";
import { VoiceCallButton } from "@/components/support/VoiceCallButton";
import { useUser } from "@clerk/nextjs";

export default function SupportCenterPage() {
    const { user } = useUser();

    return (
        <div className="flex-1 space-y-6 p-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Support Center</h2>
                <p className="text-muted-foreground mt-2">
                    Get help with account lockouts, suspicious activity, and platform issues.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LifeBuoy className="size-5" />
                                Live Incident Chat
                            </CardTitle>
                            <CardDescription>
                                Connect instantly with our AI Support Assistant or a human agent.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SupportChat />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Voice Support</CardTitle>
                            <CardDescription>
                                Prefer speaking? Our AI voice agent can assist you immediately.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <VoiceCallButton />
                        </CardContent>
                    </Card>

                    <Alert variant="default" className="bg-primary/5 border-primary/20">
                        <Info className="size-4 text-primary" />
                        <AlertTitle>Support Hours</AlertTitle>
                        <AlertDescription className="mt-2 text-sm text-muted-foreground">
                            AI Support is available 24/7. Human agent escalation is available Mon-Fri, 9am - 5pm EST.
                        </AlertDescription>
                    </Alert>

                    <Alert variant="destructive">
                        <AlertTriangle className="size-4" />
                        <AlertTitle>Account Locked?</AlertTitle>
                        <AlertDescription className="mt-2 text-sm text-muted-foreground">
                            If your account was automatically locked by the Risk Engine, please initiate a chat or call to begin identity verification.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}
