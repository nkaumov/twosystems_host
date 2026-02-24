# live-interactive (v1)

## Запуск

```bash
npm install
npm run db:migrate
npm start
```

Сервер по умолчанию стартует на `http://localhost:4010`.

## Тестовые пользователи

- Главный администратор:
  - Логин: `admin`
  - Пароль: `admin12345`
- Менеджер проекта:
  - Логин: `manager`
  - Пароль: `manager12345`

На следующем этапе обязательно смените пароли.

## Инструменты БД

```bash
npm run db:status
npm run db:query -- --sql "SELECT * FROM users LIMIT 5"
npm run db:migrate
```
