-- Migration: 002_auth_sessions_seed_user
-- Purpose: add auth sessions table and create first user for initial login.

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token (session_token),
  KEY idx_auth_sessions_user_expires (user_id, expires_at),
  KEY idx_auth_sessions_active_expires (revoked_at, expires_at),
  CONSTRAINT fk_auth_sessions_user_id FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO users (email, password_hash, display_name, status)
SELECT
  'admin@live.local',
  '$2b$10$0QXT0bV6vBiHIoM6bN5INOzyr7KJ29tHQIIZ7q70dLJBPdnQRJLza',
  'Primary Admin',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@live.local'
);
