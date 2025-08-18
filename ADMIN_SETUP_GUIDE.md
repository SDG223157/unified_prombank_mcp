# Admin Setup Guide

This guide explains how to set up admin users and understand the admin permissions system.

## Admin Role Overview

The admin role allows users to:
- Delete public prompts created by other users
- Update public prompts created by other users
- Regular users can only delete/update their own prompts
- Private prompts can only be deleted/updated by their owners (even admins cannot delete/update private prompts they don't own)

## Setting Up Admin Users

### Method 1: Using the Setup Script (Recommended)

#### For Node.js Backend:
```bash
cd backend
npm install
node scripts/set-admin-user.js
```

#### For Python Backend:
```bash
cd unified-python
python set_admin_user.py
```

### Method 2: Manual Database Update

If you have direct database access, you can run:

```sql
-- Set a user as admin by email
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';

-- Check admin users
SELECT id, email, first_name, last_name, is_admin FROM users WHERE is_admin = true;
```

### Method 3: Using Database Migration

The migration file `backend/prisma/migrations/20250819074307_add_admin_role/migration.sql` will:
1. Add the `is_admin` column to the users table
2. Set `isky999@gmail.com` as an admin user

## Admin Permissions

### Prompt Management Rules

| Prompt Type | Owner | Admin (Non-Owner) | Regular User (Non-Owner) |
|-------------|-------|-------------------|--------------------------|
| Private     | ✅ Can delete/update | ❌ Cannot delete/update | ❌ Cannot delete/update |
| Public      | ✅ Can delete/update | ✅ Can delete/update | ❌ Cannot delete/update |

### API Endpoints Affected

- `DELETE /api/prompts/:id` - Node.js backend
- `DELETE /api/prompts/{prompt_id}` - Python backend
- `PUT /api/prompts/:id` - Node.js backend
- `PUT /api/prompts/{prompt_id}` - Python backend
- MCP server deletion and update functions

## Current Admin User

The following user has been set as admin:
- **Email**: isky999@gmail.com

## Verifying Admin Status

### Via API (Node.js):
```bash
# Get user info (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/user/profile
```

### Via API (Python):
```bash
# Get user info (requires authentication)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/api/user/profile
```

### Via Database:
```sql
SELECT email, first_name, last_name, is_admin 
FROM users 
WHERE email = 'isky999@gmail.com';
```

## Error Messages

When non-admin users try to delete/update public prompts they don't own:
- **Node.js**: "Only admins can delete/update public prompts that are not their own"
- **Python**: "Only admins can delete/update public prompts that are not their own"
- **MCP**: "Only admins can delete/update public prompts that are not their own"

When users try to delete/update private prompts they don't own:
- **All backends**: "You can only delete/update your own prompts"

## Security Considerations

1. **Admin privileges are powerful** - Only trusted users should be given admin status
2. **Private prompts remain protected** - Even admins cannot delete/update private prompts they don't own
3. **Audit logging** - Consider implementing audit logs for admin actions
4. **Regular review** - Periodically review who has admin access

## Troubleshooting

### User Not Found
If you get "User with email not found", ensure:
1. The user has registered an account
2. The email address is correct (case-sensitive)
3. The user has verified their email (if email verification is enabled)

### Database Connection Issues
Ensure your database is running and the DATABASE_URL is correctly configured:
- Check docker-compose services are running
- Verify database credentials
- Test database connectivity

### Migration Issues
If the migration fails:
1. Check database permissions
2. Ensure the `is_admin` column doesn't already exist
3. Run the migration manually if needed
