-- Migration: 001_init_live_interactive
-- Purpose: create initial data model for live-interactive project.

SET NAMES utf8mb4 COLLATE utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  status ENUM('active', 'blocked', 'pending') NOT NULL DEFAULT 'active',
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_roles_user_role (user_id, role_id),
  KEY idx_user_roles_role_id (role_id),
  CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_user_roles_role_id FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS presentations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status ENUM('draft', 'ready', 'archived') NOT NULL DEFAULT 'draft',
  theme_settings_json JSON NULL,
  runtime_settings_json JSON NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_presentations_owner_status (owner_user_id, status),
  KEY idx_presentations_created_at (created_at),
  CONSTRAINT fk_presentations_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS presentation_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  presentation_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  member_role ENUM('owner', 'editor', 'operator', 'viewer') NOT NULL DEFAULT 'viewer',
  invited_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_presentation_members (presentation_id, user_id),
  KEY idx_presentation_members_user_id (user_id),
  CONSTRAINT fk_presentation_members_presentation_id FOREIGN KEY (presentation_id) REFERENCES presentations (id),
  CONSTRAINT fk_presentation_members_user_id FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_presentation_members_invited_by FOREIGN KEY (invited_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS presentation_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  presentation_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  block_type ENUM('flex', 'quiz', 'poll', 'raffle') NOT NULL,
  title VARCHAR(200) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  state ENUM('draft', 'ready', 'hidden') NOT NULL DEFAULT 'draft',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  content_json JSON NULL,
  config_json JSON NULL,
  appearance_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_presentation_blocks_presentation_order (presentation_id, sort_order),
  KEY idx_presentation_blocks_type (presentation_id, block_type),
  CONSTRAINT fk_presentation_blocks_presentation_id FOREIGN KEY (presentation_id) REFERENCES presentations (id),
  CONSTRAINT fk_presentation_blocks_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS live_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  presentation_id BIGINT UNSIGNED NOT NULL,
  started_by_user_id BIGINT UNSIGNED NOT NULL,
  session_code CHAR(12) NOT NULL,
  status ENUM('created', 'live', 'paused', 'finished', 'canceled') NOT NULL DEFAULT 'created',
  starts_at DATETIME(3) NULL,
  ends_at DATETIME(3) NULL,
  settings_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_live_sessions_session_code (session_code),
  KEY idx_live_sessions_presentation_status (presentation_id, status),
  KEY idx_live_sessions_status_created_at (status, created_at),
  CONSTRAINT fk_live_sessions_presentation_id FOREIGN KEY (presentation_id) REFERENCES presentations (id),
  CONSTRAINT fk_live_sessions_started_by_user_id FOREIGN KEY (started_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS session_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  live_session_id BIGINT UNSIGNED NOT NULL,
  link_type ENUM('tv', 'guest') NOT NULL,
  access_token CHAR(64) NOT NULL,
  status ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
  expires_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_links_access_token (access_token),
  KEY idx_session_links_session_type_status (live_session_id, link_type, status),
  CONSTRAINT fk_session_links_live_session_id FOREIGN KEY (live_session_id) REFERENCES live_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS session_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  live_session_id BIGINT UNSIGNED NOT NULL,
  source_presentation_block_id BIGINT UNSIGNED NULL,
  block_type ENUM('flex', 'quiz', 'poll', 'raffle') NOT NULL,
  title VARCHAR(200) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  launch_state ENUM('idle', 'on_air', 'completed', 'skipped') NOT NULL DEFAULT 'idle',
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  content_json JSON NULL,
  config_json JSON NULL,
  appearance_json JSON NULL,
  launched_at DATETIME(3) NULL,
  finished_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_session_blocks_session_order (live_session_id, sort_order),
  KEY idx_session_blocks_launch_state (live_session_id, launch_state),
  CONSTRAINT fk_session_blocks_live_session_id FOREIGN KEY (live_session_id) REFERENCES live_sessions (id),
  CONSTRAINT fk_session_blocks_source_presentation_block_id FOREIGN KEY (source_presentation_block_id) REFERENCES presentation_blocks (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS session_guests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  live_session_id BIGINT UNSIGNED NOT NULL,
  guest_code CHAR(12) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  device_id VARCHAR(128) NULL,
  status ENUM('connected', 'disconnected', 'left', 'banned') NOT NULL DEFAULT 'connected',
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  left_at DATETIME(3) NULL,
  meta_json JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_guests_session_guest_code (live_session_id, guest_code),
  KEY idx_session_guests_status_seen (live_session_id, status, last_seen_at),
  CONSTRAINT fk_session_guests_live_session_id FOREIGN KEY (live_session_id) REFERENCES live_sessions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS guest_actions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  live_session_id BIGINT UNSIGNED NOT NULL,
  session_guest_id BIGINT UNSIGNED NOT NULL,
  session_block_id BIGINT UNSIGNED NULL,
  action_type VARCHAR(64) NOT NULL,
  payload_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_guest_actions_session_created_at (live_session_id, created_at),
  KEY idx_guest_actions_block_type (session_block_id, action_type),
  KEY idx_guest_actions_guest_id (session_guest_id),
  CONSTRAINT fk_guest_actions_live_session_id FOREIGN KEY (live_session_id) REFERENCES live_sessions (id),
  CONSTRAINT fk_guest_actions_session_guest_id FOREIGN KEY (session_guest_id) REFERENCES session_guests (id),
  CONSTRAINT fk_guest_actions_session_block_id FOREIGN KEY (session_block_id) REFERENCES session_blocks (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO roles (code, name, description)
VALUES
  ('super_admin', 'Super Admin', 'Can manage project-level access and high-level settings'),
  ('project_admin', 'Project Admin', 'Can manage users, presentations and sessions inside project'),
  ('editor', 'Editor', 'Can edit presentations and blocks'),
  ('operator', 'Operator', 'Can run live sessions'),
  ('viewer', 'Viewer', 'Read-only access')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);
