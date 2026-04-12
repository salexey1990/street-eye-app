import * as SQLite from 'expo-sqlite';

export type SelfRating = 'FAILED' | 'PARTIAL' | 'SUCCESS';

export interface JournalEntry {
  id:            string;
  session_id:    string;
  task_id:       string;
  task_title:    string;
  task_category: string;
  note:          string | null;
  self_rating:   SelfRating;
  has_photo:     boolean;
  photo_uri:     string | null;
  created_at:    string;
  user_id:       string;
  synced:        boolean;
}

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('streeteye.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS journal_entries (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL,
      task_id       TEXT NOT NULL,
      task_title    TEXT NOT NULL,
      task_category TEXT NOT NULL,
      note          TEXT,
      self_rating   TEXT NOT NULL,
      has_photo     INTEGER DEFAULT 0,
      photo_uri     TEXT,
      created_at    TEXT NOT NULL,
      synced        INTEGER DEFAULT 0
    );
  `);
  // Migration: add user_id column if it does not exist yet.
  // Existing rows receive '' — they won't surface for any real user.
  await _db
    .execAsync(`ALTER TABLE journal_entries ADD COLUMN user_id TEXT NOT NULL DEFAULT '';`)
    .catch(() => {}); // SQLite throws if column already exists — safe to ignore
  return _db;
}

export const journalDb = {
  async getAll(userId: string): Promise<JournalEntry[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<JournalEntry | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM journal_entries WHERE id = ?',
      [id],
    );
    return row ? mapRow(row) : null;
  },

  async insert(entry: Omit<JournalEntry, 'synced'>): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO journal_entries
        (id, session_id, task_id, task_title, task_category, note, self_rating, has_photo, photo_uri, created_at, user_id, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        entry.id,
        entry.session_id,
        entry.task_id,
        entry.task_title,
        entry.task_category,
        entry.note ?? null,
        entry.self_rating,
        entry.has_photo ? 1 : 0,
        entry.photo_uri ?? null,
        entry.created_at,
        entry.user_id,
      ],
    );
  },

  async update(id: string, patch: { note?: string | null; self_rating?: SelfRating; has_photo?: boolean; photo_uri?: string | null }): Promise<void> {
    const db = await getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (patch.note !== undefined)      { sets.push('note = ?');       values.push(patch.note); }
    if (patch.self_rating !== undefined){ sets.push('self_rating = ?');values.push(patch.self_rating); }
    if (patch.has_photo !== undefined)  { sets.push('has_photo = ?');  values.push(patch.has_photo ? 1 : 0); }
    if (patch.photo_uri !== undefined)  { sets.push('photo_uri = ?');  values.push(patch.photo_uri); }
    sets.push('synced = 0');

    if (sets.length > 1) {
      await db.runAsync(
        `UPDATE journal_entries SET ${sets.join(', ')} WHERE id = ?`,
        [...values, id] as SQLite.SQLiteBindValue[],
      );
    }
  },

  async markSynced(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('UPDATE journal_entries SET synced = 1 WHERE id = ?', [id]);
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);
  },

  // Reassign entries that were created before user_id tracking (user_id='')
  // to the current user. Safe on single-user devices; on shared devices
  // orphaned rows belong to whoever logs in next.
  async claimOrphaned(userId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE journal_entries SET user_id = ? WHERE user_id = ''",
      [userId],
    );
  },

  async getPending(userId: string): Promise<JournalEntry[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM journal_entries WHERE synced = 0 AND user_id = ?',
      [userId],
    );
    return rows.map(mapRow);
  },
};

function mapRow(row: Record<string, unknown>): JournalEntry {
  return {
    id:            row.id as string,
    session_id:    row.session_id as string,
    task_id:       row.task_id as string,
    task_title:    row.task_title as string,
    task_category: row.task_category as string,
    note:          (row.note as string | null) ?? null,
    self_rating:   row.self_rating as SelfRating,
    has_photo:     Number(row.has_photo) === 1,
    photo_uri:     (row.photo_uri as string | null) ?? null,
    created_at:    row.created_at as string,
    user_id:       (row.user_id as string) ?? '',
    synced:        Number(row.synced) === 1,
  };
}
