import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv("ml-backend/.env.local")
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    print(f"Using API Key: {api_key[:10]}...")
else:
    print("API Key not found in ml-backend/.env.local")

genai.configure(api_key=api_key)

models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.5-flash']

for model_name in models:
    print(f"\nTesting model: {model_name}")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello")
        print(f"Success! Response: {response.text[:50]}")
    except Exception as e:
        print(f"Failed: {e}")
