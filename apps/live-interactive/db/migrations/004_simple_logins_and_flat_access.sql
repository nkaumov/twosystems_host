-- Migration: 004_simple_logins_and_flat_access
-- Purpose: switch demo users to simple logins and remove role assignments.

UPDATE users
SET email = 'admin'
WHERE email = 'admin@live.local';

UPDATE users
SET email = 'manager'
WHERE email = 'manager@live.local';

INSERT INTO users (email, password_hash, display_name, status)
SELECT
  'admin',
  '$2b$10$0QXT0bV6vBiHIoM6bN5INOzyr7KJ29tHQIIZ7q70dLJBPdnQRJLza',
  'Главный администратор',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin'
);

INSERT INTO users (email, password_hash, display_name, status)
SELECT
  'manager',
  '$2b$10$mSNjOVKK8QEGy7opLtpGjO7iCCMmKR4H5OUOTXRYdi2XicbqUtgY.',
  'Менеджер проекта',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'manager'
);

DELETE FROM user_roles;
