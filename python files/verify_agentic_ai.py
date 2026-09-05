import requests
import json

BASE_URL = "http://localhost:8000"
API_KEY = "aegis_master_key_2024"

def test_ai_chat():
    url = f"{BASE_URL}/api/v1/support/ai-chat"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }
    payload = {
        "ticket_id": "ts_mock_ticket", # Mock ID for testing
        "message": "Why was my account flagged recently? And what is the status of the system terminal?",
        "user_id": "devansh@example.com"
    }
    
    print(f"Sending request to {url}...")
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_ai_chat()
