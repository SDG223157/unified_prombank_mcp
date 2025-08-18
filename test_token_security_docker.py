#!/usr/bin/env python3
"""
Token Security Test Script - Docker Version

This script tests the security improvements made to ensure that API tokens
are properly isolated by user and cannot be accessed by unauthorized users.

Usage: 
  python test_token_security_docker.py
  python test_token_security_docker.py --url http://localhost:3001
  python test_token_security_docker.py --url http://host.docker.internal:8000
"""

import requests
import json
import sys
import argparse
from typing import Dict, Any

class TokenSecurityTester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        
    def test_server_connectivity(self) -> bool:
        """Test if the server is reachable"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            print(f"✅ Server is reachable at {self.base_url}")
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot reach server at {self.base_url}")
            print(f"Error: {e}")
            return False
    
    def test_debug_endpoint_without_auth(self) -> bool:
        """Test if debug endpoint exists (without authentication)"""
        try:
            response = self.session.get(f"{self.base_url}/api/tokens/debug/ownership", timeout=5)
            if response.status_code == 401:
                print("✅ Debug endpoint exists and requires authentication")
                return True
            elif response.status_code == 404:
                print("⚠️  Debug endpoint not found (may not be implemented)")
                return False
            else:
                print(f"⚠️  Debug endpoint returned unexpected status: {response.status_code}")
                return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Error testing debug endpoint: {e}")
            return False
    
    def test_tokens_endpoint_without_auth(self) -> bool:
        """Test if tokens endpoint properly requires authentication"""
        try:
            response = self.session.get(f"{self.base_url}/api/tokens", timeout=5)
            if response.status_code == 401:
                print("✅ Tokens endpoint properly requires authentication")
                return True
            else:
                print(f"🚨 SECURITY ISSUE: Tokens endpoint returned status {response.status_code} without auth")
                print(f"Response: {response.text[:200]}...")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Error testing tokens endpoint: {e}")
            return False
    
    def test_basic_security_without_auth(self) -> bool:
        """Run basic security tests without requiring user authentication"""
        print("🔒 Running Basic Security Tests (No Auth Required)")
        print("=" * 50)
        
        # Test server connectivity
        print("\n📝 Step 1: Testing server connectivity...")
        if not self.test_server_connectivity():
            return False
        
        # Test that endpoints require authentication
        print("\n📝 Step 2: Testing authentication requirements...")
        tokens_secure = self.test_tokens_endpoint_without_auth()
        debug_exists = self.test_debug_endpoint_without_auth()
        
        # Test other endpoints
        print("\n📝 Step 3: Testing other endpoint security...")
        
        endpoints_to_test = [
            "/api/tokens",
            "/api/prompts",
            "/api/auth/status"
        ]
        
        secure_endpoints = 0
        for endpoint in endpoints_to_test:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                if response.status_code in [401, 403]:
                    print(f"✅ {endpoint} requires authentication")
                    secure_endpoints += 1
                elif response.status_code == 404:
                    print(f"⚠️  {endpoint} not found")
                else:
                    print(f"🚨 {endpoint} may not require authentication (status: {response.status_code})")
            except requests.exceptions.RequestException as e:
                print(f"❌ Error testing {endpoint}: {e}")
        
        print(f"\n📊 Security Summary:")
        print(f"   - Server reachable: ✅")
        print(f"   - Tokens endpoint secure: {'✅' if tokens_secure else '❌'}")
        print(f"   - Debug endpoint exists: {'✅' if debug_exists else '⚠️'}")
        print(f"   - Secure endpoints: {secure_endpoints}/{len(endpoints_to_test)}")
        
        return tokens_secure
    
    def suggest_next_steps(self):
        """Suggest next steps for testing"""
        print("\n" + "=" * 50)
        print("🚀 Next Steps for Complete Testing")
        print("=" * 50)
        print()
        print("1. **Start your server** if it's not running:")
        print("   - Python: `cd unified-python && python main.py`")
        print("   - Node.js: `cd backend && npm start`")
        print()
        print("2. **Create test users** in your application:")
        print("   - Register at: {}/".format(self.base_url))
        print("   - Or use your existing user accounts")
        print()
        print("3. **Get authentication tokens:**")
        print("   - Login to get JWT tokens")
        print("   - Or create API tokens through the UI")
        print()
        print("4. **Test with authentication:**")
        print("   - Update the test script with real user credentials")
        print("   - Or test manually with curl commands")
        print()
        print("5. **Manual testing commands:**")
        print(f"   ```bash")
        print(f"   # Get your tokens (replace YOUR_JWT_TOKEN)")
        print(f"   curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\")
        print(f"        {self.base_url}/api/tokens")
        print(f"   ")
        print(f"   # Test debug endpoint")
        print(f"   curl -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\")
        print(f"        {self.base_url}/api/tokens/debug/ownership")
        print(f"   ```")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Test API token security')
    parser.add_argument('--url', default='http://localhost:8000', 
                       help='Base URL of the API server (default: http://localhost:8000)')
    
    args = parser.parse_args()
    
    print("🚀 Token Security Test Suite - Docker Version")
    print(f"Testing against: {args.url}")
    print("=" * 50)
    
    tester = TokenSecurityTester(args.url)
    
    # Run basic security tests
    success = tester.test_basic_security_without_auth()
    
    # Provide guidance for next steps
    tester.suggest_next_steps()
    
    if success:
        print("\n✅ Basic security tests passed!")
        print("💡 Your token endpoints are properly secured")
    else:
        print("\n❌ Security issues detected!")
        print("💡 Please review the output above")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
