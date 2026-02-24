const pool = require("../../db/pool");

async function listForUser(userId) {
  const [rows] = await pool.execute(
    `SELECT
       p.id,
       p.title,
       p.description,
       p.status,
       p.version,
       p.created_at,
       p.updated_at
     FROM presentations p
     WHERE p.owner_user_id = ?
     ORDER BY p.updated_at DESC`,
    [userId]
  );
  return rows;
}

async function create({ ownerUserId, title }) {
  const [result] = await pool.execute(
    `INSERT INTO presentations (
      owner_user_id, title, status
    ) VALUES (?, ?, 'draft')`,
    [ownerUserId, title]
  );

  const presentationId = result.insertId;

  await pool.execute(
    `INSERT INTO presentation_members (
      presentation_id, user_id, member_role, invited_by_user_id
    ) VALUES (?, ?, 'owner', ?)`,
    [presentationId, ownerUserId, ownerUserId]
  );

  return presentationId;
}

async function findByIdForUser({ presentationId, userId }) {
  const [rows] = await pool.execute(
    `SELECT
       p.id,
       p.owner_user_id,
       p.title,
       p.description,
       p.status,
       p.version,
       p.theme_settings_json,
       p.runtime_settings_json,
       p.created_at,
       p.updated_at
     FROM presentations p
     WHERE p.id = ?
       AND (
         p.owner_user_id = ?
         OR EXISTS (
           SELECT 1
           FROM presentation_members pm
           WHERE pm.presentation_id = p.id
             AND pm.user_id = ?
         )
       )
     LIMIT 1`,
    [presentationId, userId, userId]
  );
  return rows[0] || null;
}

async function deleteOwnedById({ presentationId, userId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [ownedRows] = await connection.execute(
      `SELECT id, title
       FROM presentations
       WHERE id = ?
         AND owner_user_id = ?
       LIMIT 1`,
      [presentationId, userId]
    );

    const presentation = ownedRows[0];
    if (!presentation) {
      await connection.rollback();
      return null;
    }

    await connection.execute(
      `DELETE FROM guest_actions
       WHERE live_session_id IN (
         SELECT id FROM live_sessions WHERE presentation_id = ?
       )`,
      [presentationId]
    );

    await connection.execute(
      `DELETE FROM session_links
       WHERE live_session_id IN (
         SELECT id FROM live_sessions WHERE presentation_id = ?
       )`,
      [presentationId]
    );

    await connection.execute(
      `DELETE FROM session_guests
       WHERE live_session_id IN (
         SELECT id FROM live_sessions WHERE presentation_id = ?
       )`,
      [presentationId]
    );

    await connection.execute(
      `DELETE FROM session_blocks
       WHERE live_session_id IN (
         SELECT id FROM live_sessions WHERE presentation_id = ?
       )`,
      [presentationId]
    );

    await connection.execute(
      `DELETE FROM live_sessions
       WHERE presentation_id = ?`,
      [presentationId]
    );

    await connection.execute(
      `DELETE FROM presentation_members
       WHERE presentation_id = ?`,
      [presentationId]
    );

    await connection.execute(
      `DELETE FROM presentation_blocks
       WHERE presentation_id = ?`,
      [presentationId]
    );

    await connection.execute(
      `DELETE FROM presentations
       WHERE id = ?`,
      [presentationId]
    );

    await connection.commit();
    return presentation;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listBlocksForPresentation({ presentationId, userId }) {
  const [rows] = await pool.execute(
    `SELECT
       pb.id,
       pb.block_type,
       pb.title,
       pb.sort_order,
       pb.content_json,
       pb.config_json,
       pb.appearance_json,
       pb.created_at,
       pb.updated_at
     FROM presentation_blocks pb
     INNER JOIN presentations p ON p.id = pb.presentation_id
     WHERE p.id = ?
       AND (
         p.owner_user_id = ?
         OR EXISTS (
           SELECT 1
           FROM presentation_members pm
           WHERE pm.presentation_id = p.id
             AND pm.user_id = ?
         )
       )
     ORDER BY pb.sort_order ASC, pb.id ASC`,
    [presentationId, userId, userId]
  );
  return rows;
}

async function replaceBlocksForPresentation({ presentationId, userId, blocks }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [presentationRows] = await connection.execute(
      `SELECT p.id
       FROM presentations p
       WHERE p.id = ?
         AND (
           p.owner_user_id = ?
           OR EXISTS (
             SELECT 1
             FROM presentation_members pm
             WHERE pm.presentation_id = p.id
               AND pm.user_id = ?
           )
         )
       LIMIT 1`,
      [presentationId, userId, userId]
    );

    if (!presentationRows[0]) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `DELETE FROM presentation_blocks
       WHERE presentation_id = ?`,
      [presentationId]
    );

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      await connection.execute(
        `INSERT INTO presentation_blocks (
           presentation_id,
           created_by_user_id,
           block_type,
           title,
           sort_order,
           state,
           is_enabled,
           content_json,
           config_json,
           appearance_json
         )
         VALUES (?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?)`,
        [
          presentationId,
          userId,
          block.blockType,
          block.title,
          index,
          block.contentJson,
          block.configJson,
          block.appearanceJson
        ]
      );
    }

    await connection.execute(
      `UPDATE presentations
       SET updated_at = NOW(3),
           version = version + 1
       WHERE id = ?`,
      [presentationId]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listForUser,
  create,
  findByIdForUser,
  deleteOwnedById,
  listBlocksForPresentation,
  replaceBlocksForPresentation
};
