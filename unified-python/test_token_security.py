#!/usr/bin/env python3
"""
Token Security Test Script

This script tests the security improvements made to ensure that API tokens
are properly isolated by user and cannot be accessed by unauthorized users.

Usage: python test_token_security.py
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"  # Adjust based on your setup
TEST_USERS = [
    {"email": "user1@example.com", "password": "testpass123"},
    {"email": "user2@example.com", "password": "testpass123"}
]

class TokenSecurityTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        
    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate a user and return auth headers"""
        try:
            # This is a simplified auth - adjust based on your actual auth flow
            response = self.session.post(f"{self.base_url}/api/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('token') or data.get('access_token')
                if token:
                    return {"Authorization": f"Bearer {token}"}
                else:
                    print(f"⚠️  No token in response for {email}: {data}")
                    return {}
            else:
                print(f"❌ Auth failed for {email}: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            print(f"❌ Auth error for {email}: {e}")
            return {}
    
    def create_test_token(self, headers: Dict[str, str], user_email: str) -> str:
        """Create a test token for a user"""
        try:
            response = self.session.post(f"{self.base_url}/api/tokens", 
                headers=headers,
                json={
                    "name": f"Test Token for {user_email}",
                    "description": f"Security test token for {user_email}",
                    "permissions": ["read", "write"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                token_id = data.get('id')
                print(f"✅ Created token {token_id} for {user_email}")
                return token_id
            else:
                print(f"❌ Failed to create token for {user_email}: {response.status_code} - {response.text}")
                return ""
        except Exception as e:
            print(f"❌ Error creating token for {user_email}: {e}")
            return ""
    
    def get_user_tokens(self, headers: Dict[str, str], user_email: str) -> Dict[str, Any]:
        """Get tokens for a user"""
        try:
            response = self.session.get(f"{self.base_url}/api/tokens", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Retrieved {len(data.get('tokens', []))} tokens for {user_email}")
                return data
            else:
                print(f"❌ Failed to get tokens for {user_email}: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            print(f"❌ Error getting tokens for {user_email}: {e}")
            return {}
    
    def test_debug_endpoint(self, headers: Dict[str, str], user_email: str) -> Dict[str, Any]:
        """Test the debug endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/tokens/debug/ownership", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Debug endpoint accessible for {user_email}")
                return data
            else:
                print(f"❌ Debug endpoint failed for {user_email}: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            print(f"❌ Error accessing debug endpoint for {user_email}: {e}")
            return {}
    
    def run_security_tests(self):
        """Run comprehensive security tests"""
        print("🔒 Starting Token Security Tests")
        print("=" * 50)
        
        # Step 1: Authenticate users
        print("\n📝 Step 1: Authenticating test users...")
        user_sessions = {}
        
        for i, user in enumerate(TEST_USERS):
            email = user["email"]
            password = user["password"]
            
            headers = self.authenticate_user(email, password)
            if headers:
                user_sessions[email] = headers
                print(f"✅ User {i+1} ({email}) authenticated")
            else:
                print(f"❌ User {i+1} ({email}) authentication failed")
                print("⚠️  Note: You may need to create these test users first")
        
        if len(user_sessions) < 2:
            print("\n❌ Need at least 2 authenticated users to run security tests")
            print("💡 Please create test users or update the TEST_USERS configuration")
            return False
        
        # Step 2: Create tokens for each user
        print("\n📝 Step 2: Creating test tokens...")
        user_tokens = {}
        
        for email, headers in user_sessions.items():
            token_id = self.create_test_token(headers, email)
            if token_id:
                user_tokens[email] = token_id
        
        # Step 3: Verify token isolation
        print("\n📝 Step 3: Testing token isolation...")
        
        for email, headers in user_sessions.items():
            print(f"\n🔍 Testing token access for {email}:")
            
            # Get tokens for this user
            tokens_data = self.get_user_tokens(headers, email)
            user_token_ids = [token['id'] for token in tokens_data.get('tokens', [])]
            
            # Check that user only sees their own tokens
            other_users = [other_email for other_email in user_sessions.keys() if other_email != email]
            
            security_violation = False
            for other_email in other_users:
                if other_email in user_tokens:
                    other_token_id = user_tokens[other_email]
                    if other_token_id in user_token_ids:
                        print(f"🚨 SECURITY VIOLATION: {email} can see token {other_token_id} belonging to {other_email}")
                        security_violation = True
            
            if not security_violation:
                print(f"✅ Token isolation verified for {email}")
            
            # Test debug endpoint
            debug_data = self.test_debug_endpoint(headers, email)
            if debug_data:
                user_count = debug_data.get('user_tokens_count', 0)
                total_count = debug_data.get('total_tokens_in_system', 0)
                print(f"📊 Debug info: {user_count} user tokens / {total_count} total tokens")
        
        # Step 4: Cross-user access attempts
        print("\n📝 Step 4: Testing cross-user access attempts...")
        
        emails = list(user_sessions.keys())
        if len(emails) >= 2:
            user1_email, user2_email = emails[0], emails[1]
            user1_headers = user_sessions[user1_email]
            
            if user2_email in user_tokens:
                user2_token_id = user_tokens[user2_email]
                
                # Try to access user2's token with user1's credentials
                try:
                    response = self.session.put(
                        f"{self.base_url}/api/tokens/{user2_token_id}",
                        headers=user1_headers,
                        json={"name": "Hacked Token"}
                    )
                    
                    if response.status_code in [403, 404]:
                        print(f"✅ Cross-user access properly blocked (status: {response.status_code})")
                    else:
                        print(f"🚨 SECURITY VIOLATION: Cross-user access allowed (status: {response.status_code})")
                        print(f"Response: {response.text}")
                
                except Exception as e:
                    print(f"❌ Error testing cross-user access: {e}")
        
        print("\n" + "=" * 50)
        print("🔒 Token Security Tests Completed")
        return True

def main():
    """Main function"""
    tester = TokenSecurityTester(BASE_URL)
    
    print("🚀 Token Security Test Suite")
    print(f"Testing against: {BASE_URL}")
    print("=" * 50)
    
    success = tester.run_security_tests()
    
    if success:
        print("\n✅ Security tests completed successfully!")
        print("💡 Review the output above for any security violations")
    else:
        print("\n❌ Security tests failed to complete")
        print("💡 Check your server configuration and test user setup")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
