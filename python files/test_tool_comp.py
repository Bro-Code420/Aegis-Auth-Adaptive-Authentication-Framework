import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv("ml-backend/.env.local")
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

def get_status():
    """Returns system status."""
    return {"status": "ok"}

tools = [get_status]
model_name = 'gemini-2.5-flash'

print(f"Testing tool compatibility for: {model_name}")
try:
    model = genai.GenerativeModel(model_name=model_name, tools=tools)
    chat = model.start_chat(enable_automatic_function_calling=True)
    response = chat.send_message("What is the system status?")
    print(f"Success! Response: {response.text}")
except Exception as e:
    print(f"Failed: {e}")
    import traceback
    traceback.print_exc()
