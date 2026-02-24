-- Migration: 003_localization_and_second_user
-- Purpose: localize role names/descriptions to Russian and add second user.

UPDATE roles
SET
  name = 'Суперадмин',
  description = 'Управляет доступами и ключевыми настройками проекта'
WHERE code = 'super_admin';

UPDATE roles
SET
  name = 'Администратор проекта',
  description = 'Управляет пользователями, презентациями и сессиями'
WHERE code = 'project_admin';

UPDATE roles
SET
  name = 'Редактор',
  description = 'Редактирует презентации и блоки'
WHERE code = 'editor';

UPDATE roles
SET
  name = 'Оператор',
  description = 'Запускает и ведет лайв-сессии'
WHERE code = 'operator';

UPDATE roles
SET
  name = 'Наблюдатель',
  description = 'Доступ только для просмотра'
WHERE code = 'viewer';

UPDATE users
SET display_name = 'Главный администратор'
WHERE email = 'admin@live.local';

INSERT INTO users (email, password_hash, display_name, status)
SELECT
  'manager@live.local',
  '$2b$10$mSNjOVKK8QEGy7opLtpGjO7iCCMmKR4H5OUOTXRYdi2XicbqUtgY.',
  'Менеджер проекта',
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'manager@live.local'
);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
INNER JOIN roles r ON r.code = 'super_admin'
WHERE u.email = 'admin@live.local'
  AND NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = u.id
      AND ur.role_id = r.id
  );

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
INNER JOIN roles r ON r.code = 'project_admin'
WHERE u.email = 'manager@live.local'
  AND NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = u.id
      AND ur.role_id = r.id
  );
