import urllib.request
import json

try:
    # Test login
    data = json.dumps({"email": "admin@example.com", "password": "admin123"}).encode('utf-8')
    req = urllib.request.Request(
        "http://localhost:8000/auth/login",
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req, timeout=5) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(f"✅ LOGIN SUCCESSFUL!")
        print(f"Access Token: {result['access_token'][:50]}...")
        print(f"Token Type: {result['token_type']}")
        
except urllib.error.HTTPError as e:
    print(f"❌ Login failed: {e.code}")
    print(f"Response: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"❌ Error: {e}")
