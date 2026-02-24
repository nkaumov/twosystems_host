# LUNA JSON Contracts (Draft v1)

Документ фиксирует целевые JSON-контракты и точки расширения для блоков и live-сессий.
На этом шаге это спецификация, без изменения текущего поведения API/редактора.

## 1) Общий формат editor-block

Текущий формат блока в редакторе:

```json
{
  "id": "b1",
  "type": "quiz",
  "title": "Викторина 1",
  "note": "Опциональная заметка",
  "settings": {
    "main": {},
    "content": {},
    "appearance": {},
    "additional": {}
  }
}
```

Поля:
- `id`: локальный id блока в редакторе.
- `type`: `flex | quiz | poll | raffle`.
- `title`: название блока.
- `note`: краткая заметка для редактора.
- `settings`: набор секций настроек.

## 2) Что уходит в БД сейчас

При сохранении презентации блок распадается на три JSON-колонки:

- `content_json`:
  - содержит `note`, `settings.content`, `schemaVersion`, `typeVersion`.
- `config_json`:
  - содержит `settings.main` и `settings.additional`.
- `appearance_json`:
  - содержит `settings.appearance`.

Пример (концептуально):

```json
// content_json
{
  "note": "Опциональная заметка",
  "content": { "...": "..." },
  "schemaVersion": 1,
  "typeVersion": 1
}
```

```json
// config_json
{
  "main": { "...": "..." },
  "additional": { "...": "..." }
}
```

```json
// appearance_json
{
  "...": "..."
}
```

## 3) schemaVersion / typeVersion

Нужно для управляемой эволюции форматов без ломки старых данных.

- `schemaVersion`: версия общего контракта блока.
- `typeVersion`: версия контракта конкретного типа (`quiz`, `flex`, ...).

Целевое размещение:
- в `content_json`:
  - `content_json.schemaVersion`
  - `content_json.typeVersion`
- при старте live копируется в `session_blocks.*_json` вместе с остальными данными.
- в ответе `GET /api/presentations/:id/blocks` возвращается на верхнем уровне блока:
  - `block.schemaVersion`
  - `block.typeVersion`
  - для старых данных без версий используется fallback `1/1`.

Причина:
- можно безопасно мигрировать/нормализовать старые структуры.
- реестр схем может выбирать корректный normalizer по версии.

## 4) Quiz content v1 (целевой контракт)

Ниже минимальный целевой shape для `settings.content` блока `quiz`.

```json
{
  "title": "Название викторины",
  "questions": [
    {
      "id": "q1",
      "type": "choice",
      "questionText": "Текст вопроса",
      "options": ["A", "B", "C", "D"],
      "correctOptionIndex": 1,
      "points": 1
    },
    {
      "id": "q2",
      "type": "text",
      "questionText": "Текст вопроса",
      "acceptedAnswers": ["москва", "город москва"],
      "scoring": {
        "mode": "threshold",
        "threshold": 0.82
      },
      "points": 1
    }
  ],
  "leaderboard": {
    "enabled": true,
    "title": "Лидеры"
  },
  "layouts": {
    "textAnswersView": "cloud",
    "pilePreset": "preset_a"
  }
}
```

Пояснения по MVP:
- только интерактив `TV + Guest`;
- правильные ответы не показываются на TV/Guest;
- ответ на вопрос принимается 1 раз, без редактирования;
- для `choice` на TV показывается агрегированная диаграмма без авторов;
- для `text` можно показывать имя рядом с ответом;
- `acceptedAnswers[]` + `threshold` нужны для автоначисления балла при похожести.

Для режима `pile` (мозаика) используются пресеты карт.
Пример структуры пресета:

```json
{
  "id": "preset_a",
  "points": [
    { "x": 0.1, "y": 0.2 },
    { "x": 0.3, "y": 0.45 }
  ],
  "layerOffsets": [
    { "dx": 0, "dy": 0 },
    { "dx": 6, "dy": 4 }
  ],
  "rotationJitterDeg": 2.5
}
```

## 5) Live runtime в live_sessions.settings_json

Целевой runtime shape:

```json
{
  "onAirSessionBlockId": 321,
  "quiz": {
    "currentQuestionIndex": 0
  },
  "updatedAt": "2026-02-24T12:00:00.000Z"
}
```

Назначение:
- хранить текущее состояние эфира для быстрого восстановления и единообразного рендера TV/Guest/Admin.

## 6) SSE события лайва (целевая модель)

Базовый набор событий для event-driven обновлений:

- `live.session.snapshot`
  - начальное состояние сессии при подключении клиента.
- `live.session.updated`
  - изменение статуса/метаданных сессии.
- `live.block.changed`
  - в эфир выведен другой блок.
- `live.quiz.question.changed`
  - переключение текущего вопроса.
- `live.quiz.answer.accepted`
  - принят ответ гостя.
- `live.quiz.stats.updated`
  - обновлены агрегированные результаты вопроса/эфира.
- `live.guests.count.updated`
  - изменилось число подключенных гостей.
- `live.leaderboard.updated`
  - обновлён лидерборд.

Пример payload (обобщённо):

```json
{
  "sessionId": 123,
  "eventId": "evt_000001",
  "occurredAt": "2026-02-24T12:00:00.000Z",
  "data": {}
}
```
