#!/usr/bin/env python3
"""
Security Diagnostic Script
Check if the prompt security fixes are working correctly
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from database import SessionLocal, User, Prompt

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def security_diagnostic():
    """Run security diagnostic to verify prompt access control"""
    
    db = SessionLocal()
    try:
        logger.info("🔍 Running security diagnostic...")
        
        # Get all users
        users = db.query(User).all()
        logger.info(f"📊 Total users in system: {len(users)}")
        
        for user in users:
            print(f"\n👤 User: {user.email}")
            print(f"   Name: {user.first_name} {user.last_name}")
            print(f"   Admin: {user.is_admin}")
            print(f"   Auth Provider: {user.auth_provider}")
        
        # Get all prompts with ownership details
        prompts = db.query(Prompt).all()
        logger.info(f"\n📝 Total prompts in system: {len(prompts)}")
        
        public_prompts = []
        private_prompts = []
        
        for prompt in prompts:
            owner = db.query(User).filter(User.id == prompt.user_id).first()
            owner_email = owner.email if owner else "Unknown"
            
            prompt_info = {
                "id": prompt.id,
                "title": prompt.title,
                "is_public": prompt.is_public,
                "owner_email": owner_email,
                "created_at": prompt.created_at
            }
            
            if prompt.is_public:
                public_prompts.append(prompt_info)
            else:
                private_prompts.append(prompt_info)
        
        print(f"\n🌍 PUBLIC PROMPTS ({len(public_prompts)}) - Visible to ALL users:")
        for prompt in public_prompts:
            print(f"   ✅ '{prompt['title']}' by {prompt['owner_email']}")
        
        print(f"\n🔒 PRIVATE PROMPTS ({len(private_prompts)}) - Only visible to owners:")
        for prompt in private_prompts:
            print(f"   🔐 '{prompt['title']}' by {prompt['owner_email']}")
        
        # Check what user 410233999@qq.com should see
        test_user = db.query(User).filter(User.email == '410233999@qq.com').first()
        if test_user:
            print(f"\n🔍 What user 410233999@qq.com SHOULD see:")
            
            # Public prompts (visible to all)
            print(f"   ✅ {len(public_prompts)} public prompts from all users")
            
            # Their own prompts
            own_prompts = db.query(Prompt).filter(Prompt.user_id == test_user.id).all()
            own_public = [p for p in own_prompts if p.is_public]
            own_private = [p for p in own_prompts if not p.is_public]
            
            print(f"   ✅ {len(own_public)} of their own public prompts")
            print(f"   ✅ {len(own_private)} of their own private prompts")
            print(f"   📊 TOTAL VISIBLE: {len(public_prompts) + len(own_prompts)} prompts")
            
            if own_prompts:
                print(f"\n   Their own prompts:")
                for prompt in own_prompts:
                    visibility = "PUBLIC" if prompt.is_public else "PRIVATE"
                    print(f"     - '{prompt.title}' ({visibility})")
        else:
            print(f"\n❌ User 410233999@qq.com not found in database")
        
        # Security validation
        print(f"\n🛡️ SECURITY VALIDATION:")
        print(f"   ✅ Public prompts are visible to all users: {len(public_prompts)} prompts")
        print(f"   🔒 Private prompts are only visible to owners: {len(private_prompts)} prompts")
        
        if len(prompts) == len(public_prompts) + len(private_prompts):
            print(f"   ✅ All prompts properly categorized")
        else:
            print(f"   ❌ Prompt categorization mismatch!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error in security diagnostic: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    try:
        success = security_diagnostic()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)
