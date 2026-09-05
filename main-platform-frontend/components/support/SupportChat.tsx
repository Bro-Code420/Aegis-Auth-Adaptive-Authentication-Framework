"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Send, Loader2, User, ShieldCheck, HelpCircle, Mic, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";

export function SupportChat() {
    const { user } = useUser();
    const [ticketId, setTicketId] = useState<Id<"supportTickets"> | null>(null);
    const [inputMessage, setInputMessage] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isAITyping, setIsAITyping] = useState(false);

    const tickets = useQuery(api.support.getTickets, user?.id ? { userId: user.id } : "skip");
    const createTicket = useMutation(api.support.createTicket);
    const sendMessage = useMutation(api.support.sendMessage);

    // Auto-select latest active ticket on load if available
    useEffect(() => {
        if (tickets && tickets.length > 0 && !ticketId) {
            setTicketId(tickets[0]._id);
        }
    }, [tickets, ticketId]);

    const messages = useQuery(
        api.support.getMessages,
        ticketId ? { ticketId } : "skip"
    );

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isAITyping]);

    const handleCreateTicket = async (issueType: string) => {
        if (!user?.id) return;
        const newTicketId = await createTicket({ userId: user.id, issueType });
        setTicketId(newTicketId);
    };

    const startRecording = () => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support Speech Recognition.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsRecording(true);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputMessage(prev => prev ? `${prev} ${transcript}` : transcript);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    };

    const readAloud = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const cleanText = text.replace(/[*_#`~]/g, '');
            const utterance = new SpeechSynthesisUtterance(cleanText);
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Your browser does not support text-to-speech.");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !user?.id) return;

        const messageText = inputMessage.trim();
        setInputMessage("");

        let activeTicketId = ticketId;
        if (!activeTicketId) {
            activeTicketId = await createTicket({ userId: user.id, issueType: "general_support" });
            setTicketId(activeTicketId);
        }

        await sendMessage({
            ticketId: activeTicketId,
            senderId: user.id,
            senderRole: "user",
            content: messageText,
        });

        // Trigger Agentic Gemini AI Assistant with database & diagnostics tools
        setIsAITyping(true);
        fetch("http://localhost:8000/api/v1/support/ai-chat", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-api-key": "aegis_master_key_2024" 
            },
            body: JSON.stringify({ ticket_id: activeTicketId, message: messageText, user_id: user.id })
        }).catch(e => console.error("Failed to trigger AI:", e)).finally(() => {
            setIsAITyping(false);
        });
    };

    if (!user) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (tickets === undefined) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col h-[500px] border rounded-lg bg-card shadow-sm">
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <HelpCircle className="size-5 text-primary" />
                    <h2 className="font-semibold text-lg">Live Support</h2>
                </div>
                <div className="flex items-center gap-2">
                    {ticketId && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCreateTicket("new_issue")}
                        >
                            + New Session
                        </Button>
                    )}
                    <div className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full font-mono">
                        {ticketId ? "Active Incident" : "Ready"}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!ticketId || (messages && messages.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
                        <ShieldCheck className="size-12 text-muted-foreground mb-2" />
                        <h3 className="text-lg font-medium">How can we help?</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Start a conversation with our AI Support Assistant. Ask about your account, risk scores, blocked logins, or system status.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-md">
                            <Button size="sm" onClick={() => handleCreateTicket("login_blocked")}>Login Issue</Button>
                            <Button size="sm" onClick={() => handleCreateTicket("security_alert")} variant="secondary">Security Alert</Button>
                            <Button size="sm" onClick={() => handleCreateTicket("account_unlock")} variant="outline">Unlock Account</Button>
                            <Button size="sm" onClick={() => handleCreateTicket("diagnostics")} variant="ghost">Run Diagnostics</Button>
                        </div>
                    </div>
                ) : (
                    messages?.map((msg) => {
                        const isUser = msg.senderRole === "user";
                        return (
                            <div key={msg._id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                <div className={`flex gap-2 max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className="size-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                        {isUser ? <User className="size-4" /> : <ShieldCheck className="size-4 text-primary" />}
                                    </div>
                                    <div
                                        className={`p-3 rounded-xl text-sm ${isUser
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-foreground"
                                            }`}
                                    >
                                        {isUser ? (
                                            msg.content
                                        ) : (
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        )}
                                        <div className={`flex items-center gap-2 mt-1 ${isUser ? "justify-end text-primary-foreground/70" : "text-muted-foreground"} text-[10px]`}>
                                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {!isUser && (
                                                <button onClick={() => readAloud(msg.content)} className="hover:text-primary transition-colors" title="Read Aloud">
                                                    <Volume2 className="size-3 cursor-pointer" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {isAITyping && (
                    <div className="flex justify-start">
                        <div className="flex gap-2 max-w-[80%] flex-row">
                            <div className="size-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                <ShieldCheck className="size-4 text-primary" />
                            </div>
                            <div className="p-4 rounded-xl text-sm bg-muted text-foreground flex items-center gap-1">
                                <span className="size-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="size-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="size-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                        placeholder="Type your message or ask about your account / risk score..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                    />
                    <Button type="button" onClick={startRecording} disabled={isRecording} variant="outline" size="icon" title="Voice Input">
                        <Mic className={`size-4 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
                    </Button>
                    <Button type="submit" disabled={!inputMessage.trim()} size="icon">
                        <Send className="size-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
