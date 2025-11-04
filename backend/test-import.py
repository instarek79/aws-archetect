"""
Quick test to see if all imports work
"""
print("Testing imports...")

try:
    print("1. Testing numpy...")
    import numpy as np
    print("   ✅ numpy imported")
except ImportError as e:
    print(f"   ❌ numpy failed: {e}")

try:
    print("2. Testing pandas...")
    import pandas as pd
    print("   ✅ pandas imported")
except ImportError as e:
    print(f"   ❌ pandas failed: {e}")

try:
    print("3. Testing app.main...")
    from app.main import app
    print("   ✅ app.main imported")
    print(f"   App title: {app.title}")
except ImportError as e:
    print(f"   ❌ app.main failed: {e}")
except Exception as e:
    print(f"   ❌ app.main error: {e}")

print("\nAll imports successful! Backend should start fine.")
