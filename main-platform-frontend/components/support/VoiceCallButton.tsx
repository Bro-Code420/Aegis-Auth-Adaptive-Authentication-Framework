"use client";

import { useState } from "react";
import { Phone, PhoneCall, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export function VoiceCallButton() {
    const { user } = useUser();
    const [isCalling, setIsCalling] = useState(false);
    const [callStatus, setCallStatus] = useState<"idle" | "connecting" | "active">("idle");

    const initiateCall = async () => {
        if (!user) return;
        setIsCalling(true);
        setCallStatus("connecting");

        try {
            const response = await fetch("http://localhost:8000/api/v1/support/call", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": "aegis_master_key_2024"
                },
                body: JSON.stringify({
                    user_id: user.id,
                    phone_number: user.primaryPhoneNumber?.phoneNumber || "+918855016908", // fallback
                }),
            });

            const data = await response.json();

            if (!response.ok || data.status === "error") {
                const errMsg = data.message || "Failed to initiate voice call";
                if (errMsg.includes("not yet verified") || errMsg.includes("Twilio")) {
                    toast.error("Twilio Verification Required", {
                        description: "The source phone number (+18284265775) must be verified or purchased in your Twilio account linked to ElevenLabs."
                    });
                } else {
                    toast.error(errMsg);
                }
                setCallStatus("idle");
                setIsCalling(false);
                return;
            }

            setCallStatus("active");
            toast.success(`Outbound call dispatched to ${data.phone || '+918855016908'}! Please pick up your phone.`);

            setTimeout(() => {
                setCallStatus("idle");
                setIsCalling(false);
            }, 6000);

        } catch (error: any) {
            console.error("Voice support error:", error);
            toast.error("Failed to connect to Voice Support service.");
            setCallStatus("idle");
            setIsCalling(false);
        }
    };

    return (
        <Button
            onClick={initiateCall}
            disabled={isCalling}
            variant={callStatus === "active" ? "secondary" : "default"}
            size="lg"
            className="w-full sm:w-auto"
        >
            {callStatus === "connecting" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
            ) : callStatus === "active" ? (
                <PhoneCall className="mr-2 size-4 animate-pulse text-green-500" />
            ) : (
                <Phone className="mr-2 size-4" />
            )}
            {callStatus === "connecting" ? "Connecting..." : callStatus === "active" ? "Call in Progress" : "Call Support (Voice)"}
        </Button>
    );
}
