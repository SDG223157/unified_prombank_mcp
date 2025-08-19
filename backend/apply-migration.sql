-- Manual migration script to add is_admin column
-- Run this if the automatic migration failed

-- Check if the column exists first
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'is_admin';

-- Add the column if it doesn't exist
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `is_admin` BOOLEAN NOT NULL DEFAULT false;

-- Set the specified user as admin
UPDATE `users` SET `is_admin` = true WHERE `email` = 'isky999@gmail.com';

-- Verify the column was added
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'is_admin';
