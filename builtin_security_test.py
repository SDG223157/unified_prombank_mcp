#!/usr/bin/env python3
"""
Built-in Security Test - No external dependencies required
Uses only Python standard library modules
"""

import urllib.request
import urllib.error
import json
import sys

def test_endpoint(url, description):
    """Test an endpoint and return the status code"""
    try:
        print(f"Testing: {description}")
        print(f"URL: {url}")
        
        request = urllib.request.Request(url)
        request.add_header('User-Agent', 'Security-Test/1.0')
        
        with urllib.request.urlopen(request, timeout=5) as response:
            status_code = response.getcode()
            print(f"Status: {status_code}")
            return status_code
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        return e.code
    except urllib.error.URLError as e:
        print(f"URL Error: {e.reason}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_security(base_url):
    """Test token security"""
    print("🔒 Token Security Test (Built-in modules only)")
    print("=" * 50)
    print(f"Testing server: {base_url}")
    print()
    
    success = True
    
    # Test 1: Health endpoint (should work)
    print("📝 Test 1: Server connectivity")
    health_status = test_endpoint(f"{base_url}/health", "Health check")
    
    if health_status == 200:
        print("✅ Server is running")
    elif health_status is None:
        print("❌ Cannot connect to server")
        return False
    else:
        print(f"⚠️  Health endpoint returned {health_status}")
    
    print()
    
    # Test 2: Tokens endpoint without auth (should return 401)
    print("📝 Test 2: Token endpoint security")
    tokens_status = test_endpoint(f"{base_url}/api/tokens", "Tokens endpoint (no auth)")
    
    if tokens_status == 401:
        print("✅ Tokens endpoint is properly secured (401 Unauthorized)")
    elif tokens_status == 403:
        print("✅ Tokens endpoint is properly secured (403 Forbidden)")
    elif tokens_status is None:
        print("❌ Cannot reach tokens endpoint")
        success = False
    else:
        print(f"🚨 SECURITY ISSUE: Tokens endpoint returned {tokens_status} (should be 401)")
        success = False
    
    print()
    
    # Test 3: Debug endpoint without auth (should return 401)
    print("📝 Test 3: Debug endpoint security")
    debug_status = test_endpoint(f"{base_url}/api/tokens/debug/ownership", "Debug endpoint (no auth)")
    
    if debug_status == 401:
        print("✅ Debug endpoint is properly secured (401 Unauthorized)")
    elif debug_status == 403:
        print("✅ Debug endpoint is properly secured (403 Forbidden)")
    elif debug_status == 404:
        print("ℹ️  Debug endpoint not found (may not be implemented)")
    elif debug_status is None:
        print("❌ Cannot reach debug endpoint")
    else:
        print(f"⚠️  Debug endpoint returned {debug_status}")
    
    print()
    print("=" * 50)
    
    if success:
        print("✅ SECURITY TEST PASSED!")
        print("Your token endpoints are properly secured.")
        print()
        print("💡 Next steps:")
        print("1. Login to your application")
        print("2. Get a JWT token from the browser developer tools")
        print("3. Test with authentication using curl:")
        print(f"   curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' {base_url}/api/tokens")
        print("4. Verify you only see your own tokens")
    else:
        print("❌ SECURITY ISSUES DETECTED!")
        print("Please review the test results above.")
    
    return success

def main():
    """Main function"""
    # Try different URLs that might work
    urls_to_try = [
        "http://localhost:8000",    # Python unified server
        "http://localhost:3001",    # Node.js backend  
        "http://127.0.0.1:8000",    # Alternative localhost
        "http://host.docker.internal:8000",  # Docker internal
    ]
    
    success = False
    
    for url in urls_to_try:
        print(f"\n🔍 Trying {url}...")
        print("-" * 30)
        
        try:
            if test_security(url):
                success = True
                break
        except KeyboardInterrupt:
            print("\n❌ Test interrupted by user")
            return 1
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            continue
        
        print(f"Failed to test {url}, trying next...")
    
    if not success:
        print("\n" + "=" * 50)
        print("❌ Could not successfully test any server URL")
        print()
        print("💡 Troubleshooting:")
        print("1. Make sure your server is running")
        print("2. Check which port your server is using")
        print("3. If in Docker, try: http://host.docker.internal:PORT")
        print("4. Try manual curl commands:")
        print("   curl -i http://localhost:8000/api/tokens")
        print("   (Should return 401 Unauthorized)")
        
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
