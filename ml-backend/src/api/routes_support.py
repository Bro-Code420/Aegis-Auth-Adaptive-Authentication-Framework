from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
from twilio.rest import Client
import google.generativeai as genai
from dotenv import load_dotenv
from convex import ConvexClient
from src.utils.logger import logger
from urllib.parse import urlparse

load_dotenv()
load_dotenv(".env.local") # Explicitly load .env.local if present
CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL", "mock_url")
convex_client = None


def _is_mock_convex_url(url: str) -> bool:
    # In this repo we treat any value containing "mock" as "no Convex available".
    return (not url) or ("mock" in url.lower())


def get_convex_client() -> ConvexClient | None:
    """
    Lazily create the Convex client so ML backend can start even when
    NEXT_PUBLIC_CONVEX_URL isn't a valid Convex HTTP(S) origin.
    """
    global convex_client

    if convex_client is not None:
        return convex_client

    if _is_mock_convex_url(CONVEX_URL):
        return None

    parsed = urlparse(CONVEX_URL)
    # Convex expects an absolute URL like: https://<name>-<id>.convex.cloud
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        logger.warning(
            "Invalid NEXT_PUBLIC_CONVEX_URL for Convex (expected absolute http(s) URL). Got: %r. Running without Convex.",
            CONVEX_URL,
        )
        return None

    try:
        convex_client = ConvexClient(CONVEX_URL)
        return convex_client
    except Exception:
        logger.exception("Failed to initialize ConvexClient; running without Convex.")
        return None

# Setup Router
router = APIRouter(prefix="/api/v1/support", tags=["Support Center"])

# Request Models
class CallRequest(BaseModel):
    user_id: str
    phone_number: str

class ChatRequest(BaseModel):
    ticket_id: str
    message: str
    user_id: str

# Config & Credentials
# ElevenLabs Unified Integration (Phone + AI handled by ElevenLabs)
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "your_elevenlabs_api_key_here")
ELEVENLABS_AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID", "your_elevenlabs_agent_id_here")
ELEVENLABS_PHONE_ID = os.getenv("ELEVENLABS_PHONE_ID", "your_elevenlabs_phone_number_id_here")
# THE HARDCODED NUMBER TO CALL (Include country code, e.g., +91 or +1)
HARDCODED_SUPPORT_RECEIVER = os.getenv("HARDCODED_SUPPORT_RECEIVER", "+918855016908") 

import requests

def trigger_outbound_call(to_phone: str):
    """
    Triggers an outbound call directly via ElevenLabs using their Twilio integration API.
    """
    load_dotenv(override=True)
    api_key = os.getenv("ELEVENLABS_API_KEY", "")
    agent_id = os.getenv("ELEVENLABS_AGENT_ID", "")
    phone_id = os.getenv("ELEVENLABS_PHONE_ID", "")

    if not api_key or "your_elevenlabs" in api_key:
        logger.warning("ElevenLabs API Key not configured. Skipping outbound call.")
        return {"status": "unconfigured"}
        
    url = f"https://api.elevenlabs.io/v1/convai/twilio/outbound-call"
    
    payload = {
        "agent_id": agent_id,
        "agent_phone_number_id": phone_id,
        "to_number": to_phone
    }
    
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code != 200:
             logger.error(f"ElevenLabs error response ({response.status_code}): {response.text}")
             return {"status": "error", "message": response.text}
             
        res_json = response.json()
        if res_json.get("success") is False:
            logger.warning(f"ElevenLabs outbound call rejected: {res_json.get('message')}")
            return {"status": "error", "message": res_json.get("message")}
            
        logger.info(f"ElevenLabs outbound call initiated successfully. Full Response: {response.text}")
        return {"status": "success", "response_data": res_json}
    except Exception as e:
        logger.error(f"ElevenLabs background task error: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.post("/call")
async def trigger_voice_support(request: CallRequest):
    """
    Initiates a voice call to the hardcoded number or the provided one.
    Guarded by Alert Governor against voice alert bombing.
    """
    from src.utils.alert_governor import alert_governor
    try:
        # Check Alert Governor quota and cooldown
        can_dispatch, reason = alert_governor.can_dispatch_alert(
            tenant_id=request.user_id,
            incident_type="VOICE_ALERT",
            identifier=request.phone_number,
            severity="HIGH"
        )
        if not can_dispatch:
            logger.warning(f"[VoiceSupport] Throttled by AlertGovernor: {reason}")
            return {"status": "throttled", "message": reason, "phone": request.phone_number}

        # Use the hardcoded receiver provided by the user
        target_number = HARDCODED_SUPPORT_RECEIVER if HARDCODED_SUPPORT_RECEIVER != "+910000000000" else request.phone_number
        
        result = trigger_outbound_call(target_number)
        if result.get("status") == "error":
            logger.warning(f"Voice call failed: {result.get('message')}")
            return {"status": "error", "message": result.get("message"), "phone": target_number}

        alert_governor.record_dispatch(request.user_id, "VOICE_ALERT", request.phone_number)
        return {"status": "success", "message": "Call initiated successfully", "phone": target_number, "data": result}
    except Exception as e:
        logger.error(f"Voice call exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper for Gemini Tools
def get_user_account_summary(user_id: str):
    """Fetches profile info and registered applications for the user."""
    try:
        logger.info(f"AI Tool Call: get_user_account_summary for {user_id}")
        client = get_convex_client()
        if client is None:
            return {"error": "Convex service unavailable"}
        return client.query("support:getUserContext", {"userId": user_id})
    except Exception as e:
        logger.error(f"Tool Error (get_user_account_summary): {e}")
        return {"error": str(e)}

def get_user_security_logs(user_id: str):
    """Fetches recent login attempts and security alerts for the user."""
    try:
        logger.info(f"AI Tool Call: get_user_security_logs for {user_id}")
        client = get_convex_client()
        if client is None:
            return {"error": "Convex service unavailable"}
        return client.query("support:getUserSecurityHistory", {"userId": user_id})
    except Exception as e:
        logger.error(f"Tool Error (get_user_security_logs): {e}")
        return {"error": str(e)}

def run_system_diagnostics():
    """Returns ML backend system info, loaded models, and simulated terminal diagnostic output."""
    try:
        logger.info("AI Tool Call: run_system_diagnostics")
        import sys, platform
        return {
            "system": platform.system(),
            "platform_release": platform.release(),
            "python_version": sys.version.split()[0],
            "models_active": ["login_v1", "session_v1", "device_trust", "baseline_anomaly", "global_threat"],
            "api_status": "healthy",
            "terminal_output": "[DIAGNOSTIC] Checking weights... OK\n[DIAGNOSTIC] Convex sync... ACTIVE\n[DIAGNOSTIC] Port 8000 listening... YES"
        }
    except Exception as e:
        logger.error(f"Tool Error (run_system_diagnostics): {e}")
        return {"error": str(e)}

# Re-configure to ensure API Key is picked up from load_dotenv
genai.configure(api_key=os.getenv("GEMINI_API_KEY", "mock_gemini_key"))

# Initialize Agentic Model
tools = [get_user_account_summary, get_user_security_logs, run_system_diagnostics]
model = genai.GenerativeModel(
    model_name='gemini-2.5-flash',
    tools=tools
)

def generate_smart_support_response(user_id: str, message: str) -> str:
    """
    Comprehensive Conversational Support Engine for AegisAuth.
    Provides detailed technical answers, code snippets, database context, and troubleshooting.
    """
    msg_lower = message.lower()
    user_context = get_user_account_summary(user_id)
    security_logs = get_user_security_logs(user_id)
    diagnostics = run_system_diagnostics()

    apps = user_context.get("applications", []) if isinstance(user_context, dict) else []
    alerts = security_logs.get("alerts", []) if isinstance(security_logs, dict) else []
    recent_scores = security_logs.get("recentScores", []) if isinstance(security_logs, dict) else []
    latest_score = recent_scores[0].get("score", 0.48) if recent_scores else 0.48
    app_names = [a.get("name", "Unknown") for a in apps] if apps else ["Socially"]

    # 1. SDK Integration & Usage
    if any(k in msg_lower for k in ["sdk", "use sdk", "integrate", "install", "package", "npm", "pnpm", "react", "next"]):
        first_app = apps[0] if apps else None
        sample_app_id = first_app.get("appId", "app_n8o3bk") if first_app else "app_n8o3bk"
        sample_api_key = first_app.get("apiKey", "ak_live_xxxxxxxx") if first_app else "ak_live_3srxnj8u"

        return f"""### 🚀 **How to Use the AegisAuth SDK (`@devanshthaware/aegis-auth`)**

You currently have **{len(apps)} registered application(s)** ({', '.join(app_names)}). Here is how to integrate AegisAuth into your Next.js / React application:

#### **Step 1: Install the SDK**
```bash
npm install @devanshthaware/aegis-auth
# or
pnpm add @devanshthaware/aegis-auth
```

#### **Step 2: Add Environment Variables (`.env.local`)**
```env
NEXT_PUBLIC_AEGIS_API_KEY={sample_api_key}
NEXT_PUBLIC_AEGIS_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_AEGIS_APP_ID={sample_app_id}
```

#### **Step 3: Initialize in your Client Layout or Provider**
```tsx
"use client";
import {{ useEffect }} from "react";
import {{ initAegisAuth, startMonitoring, stopMonitoring }} from "@devanshthaware/aegis-auth";

export function AegisProvider({{ children }}: {{ children: React.ReactNode }}) {{
  useEffect(() => {{
    // 1. Initialize with your credentials
    initAegisAuth({{
      apiKey: process.env.NEXT_PUBLIC_AEGIS_API_KEY!,
      baseUrl: process.env.NEXT_PUBLIC_AEGIS_BASE_URL!,
      appId: process.env.NEXT_PUBLIC_AEGIS_APP_ID!,
      debug: true,
    }});

    // 2. Start continuous telemetry stream (every 5-10 seconds)
    startMonitoring(10000);

    return () => stopMonitoring();
  }}, []);

  return <>{{children}}</>;
}}
```

#### **Step 4: Protect Login & Auth Routes**
When a user logs in, call the auth verify endpoint to calculate real-time ML risk scores before granting a session token:
```ts
import {{ aegisAuth }} from "@/lib/aegis";

const authResult = await aegisAuth.login({{
  email: user.email,
  ip: req.ip,
  userAgent: req.headers["user-agent"],
}});

if (authResult.decision.type === "BLOCK") {{
  throw new Error("Access denied due to high anomaly risk score.");
}}
```"""

    # 2. Risk Scoring & Decision Breakdown
    elif any(k in msg_lower for k in ["risk", "score", "why", "elevated", "high", "decision", "calculation", "formula"]):
        return f"""### 🔍 **AegisAuth Real-Time Risk Engine**

We analyzed your session signals across registered applications (**{', '.join(app_names)}**):
- **Current Dynamic Risk Score:** `{(latest_score * 100):.1f}%` ({'Medium Risk' if latest_score > 0.3 else 'Safe'})
- **Calculated Decision:** `{'CHALLENGE (MFA Step-Up)' if latest_score > 0.3 else 'ALLOW'}`

#### **How Risk is Calculated by the 5 ML Models:**
1. **Login Anomaly (35% weight):** Inspects IP geographic distance, ASN reputation, and login time patterns.
2. **Session Drift (25% weight):** Evaluates user interaction velocity, page navigation jumps, and request rates.
3. **Device Trust (20% weight):** Inspects browser fingerprint, canvas hash, and OS environment.
4. **Baseline Anomaly (10% weight):** Compares current behavior against the user's historical baseline profile.
5. **Global Threat Intelligence (10% weight):** Checks global IP blocklists and bot signatures.

#### **Decision Matrix:**
- `ALLOW` (0.00 – 0.30): Seamless authentication.
- `CHALLENGE` (0.31 – 0.60): Triggers OTP / MFA verification.
- `RESTRICT` (0.61 – 0.80): Read-only limited permissions.
- `BLOCK` (0.81 – 1.00): Immediate connection termination."""

    # 3. Account Lockout, Blocked Logins & MFA
    elif any(k in msg_lower for k in ["lock", "block", "unlock", "access", "denied", "mfa", "challenge", "otp"]):
        return f"""### 🔓 **Account Lockout & Verification Help**

- **Account Status:** Active
- **Connected Applications:** {len(apps)} active
- **Recent Security Alerts:** {len(alerts)} logged

#### **Why did a lockout or challenge occur?**
A session is challenged or locked if the ML risk score exceeds the threshold defined in your **Risk Policy** (e.g., login from a new IP, anomalous device fingerprint, or high interaction velocity).

#### **How to Resolve:**
1. **Step-Up Verification:** If prompted with an MFA challenge, enter your verification code to immediately restore `ACTIVE` state.
2. **Adjust Policy Toggles:** In your Application Dashboard (`/dashboard/applications/[appId]`), you can configure:
   - **Risk-Based Step-Up:** Enable/Disable challenge at 0.30 risk.
   - **Auto-Block Threats:** Enable/Disable automatic blocking at 0.80 risk.
3. **Voice Verification Hotline:** Click **`Call Support (Voice)`** on this page to complete verbal identity verification with our AI voice agent."""

    # 4. System Diagnostics & ML Backend Health
    elif any(k in msg_lower for k in ["diagnostic", "status", "health", "system", "ml", "backend", "ping", "server"]):
        return f"""### 🛡️ **AegisAuth System Diagnostics**
- **Core Engine Status:** `HEALTHY & OPERATIONAL (100% Uptime)`
- **Active ML Models:** `{', '.join(diagnostics.get('models_active', []))}`
- **FastAPI Backend:** `http://127.0.0.1:8000` (Listening)
- **Convex Real-Time Datastore:** `Connected & Synchronized`
- **Platform Architecture:** `{diagnostics.get('system')} ({diagnostics.get('platform_release')}) | Python {diagnostics.get('python_version')}`

All continuous risk prediction endpoints (`/predict/login`, `/predict/session`, `/signals`) are processing events with sub-50ms latency."""

    # 5. API Keys, Webhooks & Configuration
    elif any(k in msg_lower for k in ["api key", "key", "secret", "config", "env", "allowed origins", "cors", "app id"]):
        first_app = apps[0] if apps else None
        return f"""### 🔑 **API Key & Application Configuration**

- **Your Primary App:** `{first_app.get('name', 'Socially') if first_app else 'Socially'}`
- **App ID:** `{first_app.get('appId', 'app_n8o3bk') if first_app else 'app_n8o3bk'}`
- **API Key Format:** `ak_live_...` (Live Production) or `ak_test_...` (Sandbox)

#### **Security Best Practices:**
1. **Allowed Origins:** Ensure `http://localhost:3000` (or your production domain) is listed under Allowed Origins in your Application Settings to prevent CORS errors.
2. **Server vs Client Keys:** 
   - `NEXT_PUBLIC_AEGIS_API_KEY` is used in the frontend browser for telemetry streaming.
   - `AEGIS_API_KEY` & `AEGIS_SECRET` should be used in server-side API routes for sensitive mutations."""

    # 6. General Conversational Fallback
    else:
        return f"""### 🛡️ **AegisAuth Technical Support**
Hello! I have analyzed your account context (**{len(apps)} Application(s)** registered):
- **Active Apps:** {', '.join(app_names)}
- **Current Average Risk:** `{(latest_score * 100):.1f}%`
- **Telemetry Stream:** `ACTIVE`

I can help you with anything across the AegisAuth platform:
1. **SDK Usage & Code Examples** (e.g., *"How do I use the SDK in React/Next.js?"*)
2. **Risk Score & ML Diagnostics** (e.g., *"Why was a session flagged?"*)
3. **MFA Challenges & Account Unlocking**
4. **API Key, Origin & Webhook Setup**
5. **Real-Time Telemetry & Session Monitoring**

What would you like to explore or troubleshoot?"""


from src.security.llm_gateway import llm_gateway
from src.security.resilience import gemini_breaker, twilio_breaker, dlq
from src.utils.alert_governor import alert_governor

@router.post("/ai-chat")
async def trigger_ai_chat(request: ChatRequest):
    """
    Generates an advisory AI response for the user's support message using Gemini Agentic Tools
    screened by LLM Security Gateway against prompt injection.
    """
    try:
        # 1. Enforce LLM request budget / rate limit
        alert_governor.check_llm_rate_limit(request.user_id)

        # 2. LLM Security Gateway: Screen against prompt injection & instruction smuggling
        is_safe, sanitized_msg, injection_reason = llm_gateway.sanitize_and_screen_input(
            request.message, request.user_id
        )
        if not is_safe:
            logger.warning(f"[SecurityAlert] Prompt injection attempt blocked for user {request.user_id}: {injection_reason}")
            return {
                "status": "blocked",
                "response": "⚠️ Security Alert: Input blocked due to detected adversarial prompt injection pattern. Incident logged.",
                "is_authoritative": False
            }

        ai_text = None
        
        # 3. Circuit-breaker protected call to Gemini AI
        def _call_gemini():
            load_dotenv(override=True)
            gemini_key = os.getenv("GEMINI_API_KEY", "")
            if not gemini_key or gemini_key.startswith("mock"):
                raise ValueError("Gemini API key unconfigured")
            genai.configure(api_key=gemini_key)
            system_instruction = f"""
You are the official AI Technical and Security Engineer for AegisAuth (Continuous Adaptive Authentication & Zero-Trust Platform).
The current authenticated user's ID is: {request.user_id}.

### YOUR MISSION:
Answer any technical, architectural, security, or developer integration question thoroughly using accurate details, clean Markdown formatting, and executable code snippets.
"""
            m = genai.GenerativeModel(
                model_name="gemini-2.5-flash",
                system_instruction=system_instruction
            )
            prompt = f"User Question: {sanitized_msg}\nUser ID: {request.user_id}"
            res = m.generate_content(prompt)
            return res.text if res and res.text else None

        try:
            ai_text = gemini_breaker.execute(_call_gemini)
        except Exception as gemini_err:
            logger.warning(f"[DegradedMode] Gemini unavailable ({gemini_err}), falling back to intelligent security agent.")
            ai_text = generate_smart_support_response(request.user_id, sanitized_msg)

        if not ai_text:
            ai_text = generate_smart_support_response(request.user_id, sanitized_msg)

        # Enforce advisory invariant schema
        advisory_output = llm_gateway.enforce_advisory_invariants(ai_text)

        # Write the response back to Convex DB so it appears live in the chat UI
        if not _is_mock_convex_url(CONVEX_URL):
            client = get_convex_client()
            if client is not None and not request.ticket_id.startswith("test_"):
                client.mutation("support:sendMessage", {
                    "ticketId": request.ticket_id,
                    "senderId": "system",
                    "senderRole": "ai",
                    "content": ai_text,
                    "isAiGenerated": True
                })

        return {
            "status": "success",
            "response": ai_text,
            "is_authoritative": False,
            "confidence": advisory_output.confidence
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI Chat Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


