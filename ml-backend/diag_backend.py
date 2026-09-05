import requests
import json

def test_login():
    url = "http://localhost:8000/auth/login"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": "aegis_master_key_2024"
    }
    payload = {
        "email": "tester@diagnostic.test",
        "metadata": {
            "failed_attempts": 10,
            "location": "Test City"
        }
    }
    
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
