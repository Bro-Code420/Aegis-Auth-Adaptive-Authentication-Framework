import requests
import json

url = "http://localhost:8000/predict/risk"
payload = {
    "userId": "test_user",
    "email": "test@example.com",
    "fingerprint": {
        "userAgent": "Mozilla/5.0",
        "platform": "Win32",
        "screenResolution": "1920x1080",
        "timezone": "UTC",
        "hardwareConcurrency": 8,
        "language": "en-US",
        "cookieEnabled": True,
        "timestamp": 123456789
    },
    "simulateFlags": {
        "apiBurst": True
    }
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
