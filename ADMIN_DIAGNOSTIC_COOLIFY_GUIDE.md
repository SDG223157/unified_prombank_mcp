# Admin Diagnostic Tool - Coolify Deployment Guide

This guide helps you investigate and fix admin user privileges in your Coolify deployment.

## 🔍 Problem Description

You've noticed that `chenjg223157@gmail.com` is showing as an admin user, but according to the application configuration, only `isky999@gmail.com` should have admin privileges.

## 🛠️ Solution: Admin Diagnostic Tool

I've created a comprehensive diagnostic tool with the following components:

### 1. API Endpoints (Added to your application)

The following endpoints are now available in your deployed application:

- `GET /api/admin-diagnostic/check-all-admins` - Check all admin users
- `GET /api/admin-diagnostic/check-user/{email}` - Check specific user
- `POST /api/admin-diagnostic/fix-admin-privileges` - Fix admin privileges
- `GET /api/admin-diagnostic/database-stats` - Get database statistics

### 2. Web Interface

A user-friendly web interface is available at:
- `https://your-coolify-domain.com/admin-diagnostic`

This page provides:
- ✅ Check all admin users
- 👤 Check specific users (chenjg223157@gmail.com, isky999@gmail.com)
- 📊 Database statistics
- 🔧 One-click admin privilege fix

## 📋 How to Use

### Step 1: Deploy the Updated Code

1. **Commit and push the changes:**
   ```bash
   git add .
   git commit -m "Add admin diagnostic tool for Coolify deployment"
   git push origin unified-clean
   ```

2. **Redeploy in Coolify:**
   - Go to your Coolify dashboard
   - Find your Prompt House Premium deployment
   - Trigger a redeploy to pull the latest changes

### Step 2: Access the Diagnostic Tool

1. **Open the diagnostic interface:**
   ```
   https://your-coolify-domain.com/admin-diagnostic
   ```

2. **The page will automatically load database statistics**

### Step 3: Investigate the Issue

1. **Click "Check All Admin Users"** to see all users with admin privileges
2. **Click "Check chenjg223157@gmail.com"** to see why this user appears as admin
3. **Click "Check Expected Admin"** to verify isky999@gmail.com status

### Step 4: Fix the Issue (if needed)

1. **Click "🔧 Fix Admin Privileges"** 
2. **Confirm the action** - this will:
   - Remove admin privileges from all unauthorized users
   - Ensure only `isky999@gmail.com` has admin privileges

## 🔧 Manual API Testing

If you prefer to use API calls directly, you can test with curl:

```bash
# Check all admin users
curl https://your-coolify-domain.com/api/admin-diagnostic/check-all-admins

# Check specific user
curl https://your-coolify-domain.com/api/admin-diagnostic/check-user/chenjg223157@gmail.com

# Get database stats
curl https://your-coolify-domain.com/api/admin-diagnostic/database-stats

# Fix admin privileges (POST request)
curl -X POST https://your-coolify-domain.com/api/admin-diagnostic/fix-admin-privileges
```

## 🔍 Expected Results

### If Everything is Correct:
- Only `isky999@gmail.com` should have admin privileges
- `chenjg223157@gmail.com` should show as a regular user (not admin)
- Total admin users should be 1

### If There's an Issue:
- Multiple users will show as admin
- `chenjg223157@gmail.com` will show as an unauthorized admin
- The diagnostic tool will offer to fix the issue

## 🚨 Possible Root Causes

Based on the codebase analysis, here are potential reasons why `chenjg223157@gmail.com` might show as admin:

1. **Manual Database Modification**: Someone manually updated the database
2. **Migration Issue**: The admin migration ran incorrectly
3. **Application Bug**: There might be a bug in the admin assignment logic
4. **Database Corruption**: Database inconsistency

## 📊 What the Diagnostic Tool Will Show

The tool will provide:

1. **Current Admin Users**: List of all users with admin privileges
2. **User Details**: Detailed information about specific users
3. **Database Statistics**: Overall user statistics
4. **Fix Actions**: Automated fix for admin privilege issues

## 🔒 Security Note

The diagnostic page (`/admin-diagnostic`) is temporarily accessible without authentication to help debug the issue. After resolving the problem, you may want to:

1. Remove the diagnostic endpoints
2. Or add authentication to the diagnostic page
3. Or restrict access by IP address

## 📝 Next Steps

1. **Deploy the changes** to your Coolify environment
2. **Access the diagnostic tool** at `/admin-diagnostic`
3. **Investigate the current admin users**
4. **Fix the issue** if unauthorized admins are found
5. **Verify the fix** by rechecking admin users

## 🆘 If You Need Help

If the diagnostic tool doesn't resolve the issue:

1. **Check the application logs** in Coolify
2. **Verify database connectivity** 
3. **Check environment variables** (DATABASE_URL, etc.)
4. **Contact support** with the diagnostic results

## 📱 Files Modified

The following files were added/modified:

- `unified-python/admin_diagnostic_api.py` - API endpoints
- `unified-python/templates/admin_diagnostic.html` - Web interface
- `unified-python/main.py` - Added routes and imports
- `ADMIN_DIAGNOSTIC_COOLIFY_GUIDE.md` - This guide

## 🎯 Expected Outcome

After using this tool, you should have:
- ✅ Only `isky999@gmail.com` as admin
- ❌ `chenjg223157@gmail.com` as regular user
- 🔍 Clear understanding of what caused the issue
- 🛡️ Proper admin privileges restored
