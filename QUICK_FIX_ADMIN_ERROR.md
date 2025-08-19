# Quick Fix: Admin Column Error

## 🚨 Problem
Getting this error:
```
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) (1054, "Unknown column 'users.is_admin' in 'field list'")
```

## ⚡ Quick Solutions

### Option 1: Run Migration Script (Fastest)

If you have access to the Python environment:

```bash
# Navigate to the Python app directory
cd unified-python

# Run the migration script
python apply_admin_migration.py
```

### Option 2: Docker Container Fix

If running in Docker:

```bash
# Find your container
docker ps

# Run migration inside container
docker exec -it <container_name> python apply_admin_migration.py

# Restart container
docker restart <container_name>
```

### Option 3: Manual SQL Fix

Connect to your MySQL database and run:

```sql
ALTER TABLE `users` ADD COLUMN `is_admin` BOOLEAN NOT NULL DEFAULT false;
UPDATE `users` SET `is_admin` = true WHERE `email` = 'isky999@gmail.com';
```

### Option 4: Coolify/Production Fix

1. **Access your deployment environment**
2. **Execute the migration script**:
   ```bash
   python apply_admin_migration.py
   ```
3. **Restart the application**

## ✅ Verification

After applying the fix, check:

```sql
-- Verify column exists
DESCRIBE users;

-- Check admin user
SELECT email, is_admin FROM users WHERE email = 'isky999@gmail.com';
```

## 🔄 Restart Required

After applying the migration, restart your application to clear any cached schema information.

## 📋 What This Fixes

- ✅ Adds missing `is_admin` column to users table
- ✅ Sets `isky999@gmail.com` as admin user
- ✅ Enables admin functionality for public prompt management
- ✅ Resolves database schema mismatch error

The application should work normally after applying this fix!
