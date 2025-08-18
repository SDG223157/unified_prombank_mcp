-- AddAdminRole migration
-- Add is_admin column to users table

ALTER TABLE `users` ADD COLUMN `is_admin` BOOLEAN NOT NULL DEFAULT false;

-- Set the specified user as admin
UPDATE `users` SET `is_admin` = true WHERE `email` = 'isky999@gmail.com';
