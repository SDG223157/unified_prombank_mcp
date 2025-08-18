#!/usr/bin/env python3
"""
Simple Token Security Test

Copy this file into your Docker container and run it to test token security.
"""

import json
import sys

try:
    import requests
except ImportError:
    print("❌ requests module not found. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

def test_basic_security(base_url="http://localhost:8000"):
    """Test basic token security without authentication"""
    print("🔒 Simple Token Security Test")
    print("=" * 40)
    print(f"Testing: {base_url}")
    print()
    
    session = requests.Session()
    
    # Test 1: Health check
    print("📝 Test 1: Server connectivity...")
    try:
        response = session.get(f"{base_url}/health", timeout=5)
        print(f"✅ Server is reachable (status: {response.status_code})")
    except Exception as e:
        print(f"❌ Cannot reach server: {e}")
        print("💡 Try different URLs:")
        print("   - http://localhost:3001 (Node.js)")
        print("   - http://localhost:8000 (Python)")
        print("   - http://host.docker.internal:8000")
        return False
    
    # Test 2: Tokens endpoint without auth
    print("\n📝 Test 2: Token endpoint security...")
    try:
        response = session.get(f"{base_url}/api/tokens", timeout=5)
        if response.status_code == 401:
            print("✅ Tokens endpoint requires authentication (401)")
        elif response.status_code == 403:
            print("✅ Tokens endpoint requires authentication (403)")
        else:
            print(f"🚨 SECURITY ISSUE: Tokens endpoint returned {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            return False
    except Exception as e:
        print(f"❌ Error testing tokens endpoint: {e}")
        return False
    
    # Test 3: Other endpoints
    print("\n📝 Test 3: Other endpoint security...")
    endpoints = ["/api/auth/status", "/api/prompts"]
    
    for endpoint in endpoints:
        try:
            response = session.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code in [200, 401, 403]:
                status = "✅" if response.status_code in [401, 403] else "ℹ️"
                print(f"{status} {endpoint}: {response.status_code}")
            else:
                print(f"⚠️  {endpoint}: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint}: Error - {e}")
    
    print("\n" + "=" * 40)
    print("✅ Basic security tests completed!")
    print("\n💡 Next steps:")
    print("1. Login to your app to get a JWT token")
    print("2. Test with authentication:")
    print(f"   curl -H 'Authorization: Bearer YOUR_TOKEN' {base_url}/api/tokens")
    print("3. Verify you only see your own tokens")
    
    return True

if __name__ == "__main__":
    # Try different URLs
    urls_to_try = [
        "http://localhost:8000",
        "http://localhost:3001", 
        "http://host.docker.internal:8000",
        "http://127.0.0.1:8000"
    ]
    
    success = False
    for url in urls_to_try:
        print(f"\n🔍 Trying {url}...")
        try:
            if test_basic_security(url):
                success = True
                break
        except KeyboardInterrupt:
            print("\n❌ Test interrupted")
            break
        except Exception as e:
            print(f"❌ Test failed: {e}")
            continue
    
    if not success:
        print("\n❌ Could not connect to server on any URL")
        print("💡 Make sure your server is running!")
    
    sys.exit(0 if success else 1)
