const crypto = require("crypto");
const pool = require("../../db/pool");

function generateSessionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 12; index += 1) {
    const byte = crypto.randomBytes(1)[0];
    code += alphabet[byte % alphabet.length];
  }
  return code;
}

function generateAccessToken() {
  return crypto.randomBytes(32).toString("hex");
}

function toJsonValue(value, fallback = null) {
  if (!value) {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toObject(value, fallback = {}) {
  if (!value) {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function createLiveSession({ presentationId, ownerUserId, settingsJson }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sessionCode = generateSessionCode();
    try {
      const [result] = await pool.execute(
        `INSERT INTO live_sessions (
           presentation_id,
           started_by_user_id,
           session_code,
           status,
           starts_at,
           settings_json
         )
         VALUES (?, ?, ?, 'live', NOW(3), ?)`,
        [presentationId, ownerUserId, sessionCode, JSON.stringify(settingsJson || {})]
      );

      const [rows] = await pool.execute(
        `SELECT
           id,
           presentation_id,
           started_by_user_id,
           session_code,
           status,
           starts_at,
           ends_at,
           settings_json,
           created_at,
           updated_at
         FROM live_sessions
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
      );

      return rows[0] || null;
    } catch (error) {
      const duplicateCode =
        error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062);
      if (!duplicateCode || attempt === 4) {
        throw error;
      }
    }
  }

  throw new Error("Failed to create live session.");
}

async function createSessionLinks({ liveSessionId }) {
  const linkTypes = ["tv", "guest"];
  const links = [];

  for (const linkType of linkTypes) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const accessToken = generateAccessToken();
      try {
        await pool.execute(
          `INSERT INTO session_links (
             live_session_id,
             link_type,
             access_token,
             status
           )
           VALUES (?, ?, ?, 'active')`,
          [liveSessionId, linkType, accessToken]
        );
        links.push({
          type: linkType,
          token: accessToken,
          slug: accessToken
        });
        break;
      } catch (error) {
        const duplicateToken =
          error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062);
        if (!duplicateToken || attempt === 4) {
          throw error;
        }
      }
    }
  }

  links.push({
    type: "admin",
    token: String(liveSessionId),
    slug: String(liveSessionId)
  });

  return links;
}

async function copyPresentationBlocksToSession({ presentationId, liveSessionId }) {
  await pool.execute(
    `INSERT INTO session_blocks (
       live_session_id,
       source_presentation_block_id,
       block_type,
       title,
       sort_order,
       launch_state,
       is_enabled,
       content_json,
       config_json,
       appearance_json
     )
     SELECT
       ?,
       pb.id,
       pb.block_type,
       pb.title,
       pb.sort_order,
       'idle',
       pb.is_enabled,
       pb.content_json,
       pb.config_json,
       pb.appearance_json
     FROM presentation_blocks pb
     WHERE pb.presentation_id = ?
     ORDER BY pb.sort_order ASC, pb.id ASC`,
    [liveSessionId, presentationId]
  );
}

async function getSessionByIdForOwner({ liveSessionId, ownerUserId }) {
  const [rows] = await pool.execute(
    `SELECT
       ls.id,
       ls.presentation_id,
       ls.started_by_user_id,
       ls.session_code,
       ls.status,
       ls.starts_at,
       ls.ends_at,
       ls.settings_json,
       ls.created_at,
       ls.updated_at
     FROM live_sessions ls
     INNER JOIN presentations p ON p.id = ls.presentation_id
     WHERE ls.id = ?
       AND p.owner_user_id = ?
     LIMIT 1`,
    [liveSessionId, ownerUserId]
  );
  return rows[0] || null;
}

async function getSessionById({ liveSessionId }) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       presentation_id,
       started_by_user_id,
       session_code,
       status,
       starts_at,
       ends_at,
       settings_json,
       created_at,
       updated_at
     FROM live_sessions
     WHERE id = ?
     LIMIT 1`,
    [liveSessionId]
  );
  return rows[0] || null;
}

async function getSessionLinkByToken({ accessToken }) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       live_session_id,
       link_type,
       access_token,
       status,
       expires_at,
       revoked_at,
       created_at
     FROM session_links
     WHERE access_token = ?
       AND status = 'active'
     LIMIT 1`,
    [accessToken]
  );
  return rows[0] || null;
}

async function getSessionLinks({ liveSessionId }) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       live_session_id,
       link_type,
       access_token,
       status,
       expires_at,
       revoked_at,
       created_at
     FROM session_links
     WHERE live_session_id = ?
     ORDER BY id ASC`,
    [liveSessionId]
  );
  return rows;
}

async function listSessionBlocks({ liveSessionId }) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       block_type,
       title,
       sort_order,
       content_json,
       config_json,
       appearance_json
     FROM session_blocks
     WHERE live_session_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [liveSessionId]
  );
  return rows;
}

async function getGuestByDeviceKey({ liveSessionId, deviceKey }) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       live_session_id,
       guest_code,
       display_name,
       avatar_url,
       device_id,
       status,
       joined_at,
       last_seen_at,
       left_at,
       meta_json
     FROM session_guests
     WHERE live_session_id = ?
       AND device_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [liveSessionId, deviceKey]
  );
  return rows[0] || null;
}

async function createGuest({ liveSessionId, deviceKey, displayName }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const guestCode = generateSessionCode();
    try {
      const [result] = await pool.execute(
        `INSERT INTO session_guests (
           live_session_id,
           guest_code,
           display_name,
           device_id,
           status,
           joined_at,
           last_seen_at
         )
         VALUES (?, ?, ?, ?, 'connected', NOW(3), NOW(3))`,
        [liveSessionId, guestCode, displayName, deviceKey]
      );
      const [rows] = await pool.execute(
        `SELECT
           id,
           live_session_id,
           guest_code,
           display_name,
           avatar_url,
           device_id,
           status,
           joined_at,
           last_seen_at,
           left_at,
           meta_json
         FROM session_guests
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
      );
      return rows[0] || null;
    } catch (error) {
      const duplicateCode =
        error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062);
      if (!duplicateCode || attempt === 4) {
        throw error;
      }
    }
  }
  throw new Error("Failed to create guest.");
}

async function upsertGuestName({ liveSessionId, guestId, displayName }) {
  await pool.execute(
    `UPDATE session_guests
     SET display_name = ?,
         status = 'connected',
         last_seen_at = NOW(3)
     WHERE id = ?
       AND live_session_id = ?`,
    [displayName, guestId, liveSessionId]
  );

  const [rows] = await pool.execute(
    `SELECT
       id,
       live_session_id,
       guest_code,
       display_name,
       avatar_url,
       device_id,
       status,
       joined_at,
       last_seen_at,
       left_at,
       meta_json
     FROM session_guests
     WHERE id = ?
       AND live_session_id = ?
     LIMIT 1`,
    [guestId, liveSessionId]
  );
  return rows[0] || null;
}

async function touchGuestSeen({ liveSessionId, guestId }) {
  await pool.execute(
    `UPDATE session_guests
     SET status = 'connected',
         last_seen_at = NOW(3)
     WHERE id = ?
       AND live_session_id = ?`,
    [guestId, liveSessionId]
  );
}

async function clearGuestPreviousAnswer({
  liveSessionId,
  guestId,
  sessionBlockId,
  actionType,
  questionIndex
}) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       payload_json
     FROM guest_actions
     WHERE live_session_id = ?
       AND session_guest_id = ?
       AND session_block_id = ?
       AND action_type = ?`,
    [liveSessionId, guestId, sessionBlockId, actionType]
  );

  if (!rows.length) {
    return;
  }

  const idsToDelete = [];
  for (const row of rows) {
    const payload = toJsonValue(row.payload_json, {});
    const payloadQuestionIndex = Number.isInteger(Number(payload?.questionIndex))
      ? Number(payload.questionIndex)
      : null;
    if (actionType === "quiz.answer") {
      if (payloadQuestionIndex === questionIndex) {
        idsToDelete.push(Number(row.id));
      }
      continue;
    }
    idsToDelete.push(Number(row.id));
  }

  if (!idsToDelete.length) {
    return;
  }

  const placeholders = idsToDelete.map(() => "?").join(", ");
  await pool.execute(
    `DELETE FROM guest_actions
     WHERE id IN (${placeholders})`,
    idsToDelete
  );
}

async function insertGuestAction({
  liveSessionId,
  guestId,
  sessionBlockId,
  actionType,
  payloadJson
}) {
  const normalizedPayload = payloadJson && typeof payloadJson === "object" ? payloadJson : {};
  const questionIndex = Number.isInteger(Number(normalizedPayload.questionIndex))
    ? Number(normalizedPayload.questionIndex)
    : null;

  if (actionType === "quiz.answer" || actionType === "poll.vote") {
    await clearGuestPreviousAnswer({
      liveSessionId,
      guestId,
      sessionBlockId,
      actionType,
      questionIndex
    });
  }

  const [result] = await pool.execute(
    `INSERT INTO guest_actions (
       live_session_id,
       session_guest_id,
       session_block_id,
       action_type,
       payload_json
     )
     VALUES (?, ?, ?, ?, ?)`,
    [liveSessionId, guestId, sessionBlockId, actionType, JSON.stringify(normalizedPayload)]
  );

  const [rows] = await pool.execute(
    `SELECT
       id,
       live_session_id,
       session_guest_id,
       session_block_id,
       action_type,
       payload_json,
       created_at
     FROM guest_actions
     WHERE id = ?
     LIMIT 1`,
    [result.insertId]
  );
  return rows[0] || null;
}

async function getQuizStats({ liveSessionId, sessionBlockId, questionIndex }) {
  const [rows] = await pool.execute(
    `SELECT
       ga.id,
       ga.session_guest_id,
       ga.payload_json,
       ga.created_at,
       sg.display_name
     FROM guest_actions ga
     LEFT JOIN session_guests sg ON sg.id = ga.session_guest_id
     WHERE ga.live_session_id = ?
       AND ga.session_block_id = ?
       AND ga.action_type = 'quiz.answer'
     ORDER BY ga.id ASC`,
    [liveSessionId, sessionBlockId]
  );

  const counts = {};
  const textAnswers = [];
  let totalVotes = 0;

  for (const row of rows) {
    const payload = toJsonValue(row.payload_json, {});
    const payloadQuestionIndex = Number(payload?.questionIndex);
    if (!Number.isInteger(payloadQuestionIndex) || payloadQuestionIndex !== questionIndex) {
      continue;
    }
    totalVotes += 1;

    if (payload?.mode === "choice") {
      const optionIndex = Number(payload?.optionIndex);
      if (Number.isInteger(optionIndex) && optionIndex >= 0) {
        const key = String(optionIndex);
        counts[key] = (counts[key] || 0) + 1;
      }
      continue;
    }

    if (payload?.mode === "text") {
      const text = String(payload?.text || "").trim();
      if (!text) {
        continue;
      }
      textAnswers.push({
        guestId: row.session_guest_id,
        displayName: row.display_name || "Гость",
        text
      });
    }
  }

  return {
    counts,
    totalVotes,
    textAnswers: textAnswers.slice(-50)
  };
}

async function getPollStats({ liveSessionId, sessionBlockId }) {
  const [rows] = await pool.execute(
    `SELECT
       payload_json
     FROM guest_actions
     WHERE live_session_id = ?
       AND session_block_id = ?
       AND action_type = 'poll.vote'
     ORDER BY id ASC`,
    [liveSessionId, sessionBlockId]
  );

  const counts = {};
  let totalVotes = 0;

  for (const row of rows) {
    const payload = toJsonValue(row.payload_json, {});
    const optionIndex = Number(payload?.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0) {
      continue;
    }
    const key = String(optionIndex);
    counts[key] = (counts[key] || 0) + 1;
    totalVotes += 1;
  }

  return {
    counts,
    totalVotes
  };
}

async function getSessionBlockById({ liveSessionId, sessionBlockId }) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       live_session_id,
       source_presentation_block_id,
       block_type,
       title,
       sort_order,
       launch_state,
       is_enabled,
       content_json,
       config_json,
       appearance_json,
       launched_at,
       finished_at,
       created_at,
       updated_at
     FROM session_blocks
     WHERE live_session_id = ?
       AND id = ?
     LIMIT 1`,
    [liveSessionId, sessionBlockId]
  );
  return rows[0] || null;
}

async function updateLiveSettings({ liveSessionId, patch }) {
  const session = await getSessionById({ liveSessionId });
  if (!session) {
    return null;
  }

  const currentSettings = toObject(session.settings_json, {});
  const safePatch = patch && typeof patch === "object" ? patch : {};
  const nextSettings = {
    ...currentSettings,
    ...safePatch
  };

  if (
    Object.prototype.hasOwnProperty.call(safePatch, "quiz") &&
    safePatch.quiz &&
    typeof safePatch.quiz === "object" &&
    !Array.isArray(safePatch.quiz)
  ) {
    nextSettings.quiz = {
      ...toObject(currentSettings.quiz, {}),
      ...safePatch.quiz
    };
  }

  nextSettings.updatedAt = new Date().toISOString();

  await pool.execute(
    `UPDATE live_sessions
     SET settings_json = ?, updated_at = NOW(3)
     WHERE id = ?`,
    [JSON.stringify(nextSettings), liveSessionId]
  );

  return nextSettings;
}

async function findPresentationOwnedByUser({ presentationId, ownerUserId }) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       owner_user_id,
       title
     FROM presentations
     WHERE id = ?
       AND owner_user_id = ?
     LIMIT 1`,
    [presentationId, ownerUserId]
  );
  return rows[0] || null;
}

module.exports = {
  createLiveSession,
  createSessionLinks,
  copyPresentationBlocksToSession,
  getSessionByIdForOwner,
  getSessionById,
  getSessionLinkByToken,
  getSessionBlockById,
  updateLiveSettings,
  getSessionLinks,
  listSessionBlocks,
  getGuestByDeviceKey,
  createGuest,
  upsertGuestName,
  touchGuestSeen,
  insertGuestAction,
  getQuizStats,
  getPollStats,
  findPresentationOwnedByUser
};
