# Database Migration Guide

This guide helps you apply the admin role migration that adds the `is_admin` column to the users table.

## 🚨 Error Symptoms

If you see this error:
```
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) (1054, "Unknown column 'users.is_admin' in 'field list'")
```

This means the database migration hasn't been applied yet.

## 🔧 Solution Options

### Option 1: Automatic Migration Script (Recommended)

Run the Python migration script:

```bash
# For Python backend
cd unified-python
python apply_admin_migration.py

# Or with the correct Python path in Docker:
python3 apply_admin_migration.py
```

### Option 2: Manual SQL Migration

Connect to your database and run:

```sql
-- Check if column exists
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'is_admin';

-- Add the column if it doesn't exist
ALTER TABLE `users` ADD COLUMN `is_admin` BOOLEAN NOT NULL DEFAULT false;

-- Set the admin user
UPDATE `users` SET `is_admin` = true WHERE `email` = 'isky999@gmail.com';
```

### Option 3: Prisma Migration (Node.js Backend)

If using the Node.js backend:

```bash
cd backend
npx prisma migrate deploy
```

### Option 4: Docker Container Migration

If running in Docker, exec into the container:

```bash
# Find your container
docker ps

# Exec into the container
docker exec -it <container_name> /bin/bash

# Run the migration
python apply_admin_migration.py
```

## 🔍 Verification

After applying the migration, verify it worked:

```sql
-- Check the column exists
DESCRIBE users;

-- Check admin user
SELECT email, is_admin FROM users WHERE email = 'isky999@gmail.com';
```

You should see:
- `is_admin` column exists with type `tinyint(1)` (BOOLEAN)
- User `isky999@gmail.com` has `is_admin = 1` (true)

## 🚀 Restart Application

After applying the migration, restart your application:

```bash
# Docker Compose
docker-compose restart

# Or individual container
docker restart <container_name>

# Or if running locally
# Kill the process and restart
```

## 🛠️ Troubleshooting

### Migration Script Fails

1. **Check database connection**:
   ```bash
   # Verify DATABASE_URL environment variable
   echo $DATABASE_URL
   ```

2. **Check database permissions**:
   - Ensure the database user has ALTER TABLE permissions
   - Verify the database exists and is accessible

3. **Manual verification**:
   ```bash
   # Connect to database directly
   mysql -h <host> -u <user> -p <database>
   
   # Run the SQL commands manually
   ```

### User Not Found

If the admin user `isky999@gmail.com` doesn't exist:

1. **Create the user first** by registering through the web interface
2. **Run the migration again** after the user exists
3. **Or update the migration** to use a different email address

### Docker Issues

1. **Check container logs**:
   ```bash
   docker logs <container_name>
   ```

2. **Verify database container is running**:
   ```bash
   docker ps | grep mysql
   ```

3. **Check network connectivity**:
   ```bash
   docker exec <app_container> ping <db_container>
   ```

## 📋 Migration Files

The migration is defined in:
- **Prisma**: `backend/prisma/migrations/20250819074307_add_admin_role/migration.sql`
- **Manual SQL**: `backend/apply-migration.sql`
- **Python Script**: `unified-python/apply_admin_migration.py`

## ✅ Success Indicators

After successful migration:
- ✅ Application starts without database errors
- ✅ Admin user can delete/update public prompts
- ✅ Regular users cannot delete/update others' public prompts
- ✅ All users can manage their own prompts

## 🆘 Need Help?

If the migration still fails:
1. Check application logs for specific error messages
2. Verify database connectivity and permissions
3. Ensure the database schema is up to date
4. Contact support with the full error message and environment details
