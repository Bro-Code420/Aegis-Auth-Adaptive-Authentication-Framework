from convex import ConvexClient
from dotenv import load_dotenv
import os

load_dotenv(".env")
url = os.getenv("NEXT_PUBLIC_CONVEX_URL", "https://insightful-perch-941.convex.cloud")
client = ConvexClient(url)

try:
    print("Testing mutation...")
    client.mutation("support:sendMessage", {
        "ticketId": "fake",
        "senderId": "system",
        "senderRole": "ai",
        "content": "testing",
        "isAiGenerated": True
    })
    print("Mutation successful")
except Exception as e:
    print(f"Error: {repr(e)}")
