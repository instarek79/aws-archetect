import requests
import sys

try:
    # Test health endpoint
    response = requests.get("http://localhost:8000/health", timeout=5)
    print(f"✅ Health check: {response.status_code} - {response.json()}")
    
    # Test login endpoint
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    response = requests.post("http://localhost:8000/auth/login", json=login_data, timeout=5)
    print(f"✅ Login test: {response.status_code}")
    if response.status_code == 200:
        print(f"Token received: {response.json().get('access_token', '')[:50]}...")
    else:
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
