/**
 * Independent, validated JSON storage for Persona.
 *
 * One plugin owns one directory.  Every durable replacement is a same-directory
 * temp file opened with exclusive create and renamed over the target, so a
 * reader sees either the complete old document or the complete new document.
 * Mutations are serialized in-process, require the caller's current global
 * revision, append a bounded prior-state history entry, validate the complete
 * next document, and only then publish it in memory.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from 'node:fs/promises';
import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute, dirname, join } from 'node:path';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  LIMITS,
  makeInitialState,
  tokenMetadata,
  validateBackupDocument,
  validateStateDocument,
} from './validation.js';
import {
  PersonaConflictError,
  PersonaNotFoundError,
  PersonaStorageError,
  PersonaValidationError,
} from './errors.js';

const STATE_FILE = 'persona.json';
const CORE_FILE = 'SOUL.md';
const STYLES_DIR = 'styles';
const BACKUPS_DIR = 'backups';
const BACKUP_NAME = /^backup-[a-z0-9-]{8,80}\.json$/;
const WINDOWS_TRANSIENT_RENAME = new Set(['EACCES', 'EBUSY', 'EPERM']);

/**
 * @param {unknown} value candidate.
 * @returns {value is Record<string, any>} plain object.
 */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {Record<string, any>} state full state.
 * @returns {Record<string, any>} mutable entity subset.
 */
function entityOf(state) {
  return structuredClone({
    core: state.core,
    styles: state.styles,
    defaultStyleId: state.defaultStyleId,
    workspaceId: state.workspaceId,
    bindingWorkspaceId: state.bindingWorkspaceId ?? state.workspaceId,
    injectionEnabled: state.injectionEnabled,
    bindings: state.bindings,
  });
}

/**
 * @param {string} value candidate.
 * @returns {string} normalized backup reason.
 */
function normalizeReason(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return 'manual';
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  const characters = [...cleaned];
  return characters.length > LIMITS.MAX_BACKUP_REASON_CHARS
    ? characters.slice(0, LIMITS.MAX_BACKUP_REASON_CHARS).join('')
    : cleaned;
}

/**
 * @param {number} ms delay.
 * @returns {Promise<void>} timer.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rename with bounded retries for transient Windows sharing errors.
 * @param {string} temp temp path.
 * @param {string} target final path.
 */
async function renameWithRetry(temp, target) {
  let delay = 20;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(temp, target);
      return;
    } catch (error) {
      if (process.platform !== 'win32'
        || !WINDOWS_TRANSIENT_RENAME.has(/** @type {any} */ (error)?.code)
        || attempt >= 8) throw error;
    }
    await sleep(delay);
    delay = Math.min(delay * 2, 200);
  }
}

/**
 * Atomically replace one file with fresh mode 0600 content.
 * @param {string} target final path.
 * @param {string} content complete UTF-8 content.
 */
async function writeFileAtomic(target, content) {
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  const temp = `${target}.${randomBytes(6).toString('hex')}.tmp`;
  let handle;
  try {
    handle = await open(temp, 'wx', 0o600);
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await renameWithRetry(temp, target);
  } catch (error) {
    if (handle !== undefined) {
      try { await handle.close(); } catch { /* preserve the original failure */ }
    }
    try { await rm(temp, { force: true }); } catch { /* preserve the original failure */ }
    throw error;
  }
}

export class PersonaStore {
  /**
   * @param {{directory: string, maxHistory?: number, now?: () => Date|string, logger?: Record<string, any>}} options store options.
   */
  constructor(options) {
    if (!isObject(options) || typeof options.directory !== 'string' || !isAbsolute(options.directory)) {
      throw new TypeError('PersonaStore requires an absolute data directory');
    }
    this.directory = options.directory;
    this.stateFile = join(this.directory, STATE_FILE);
    this.backupsDirectory = join(this.directory, BACKUPS_DIR);
    this.maxHistory = Number.isSafeInteger(options.maxHistory)
      ? Math.min(Math.max(options.maxHistory, 10), LIMITS.MAX_HISTORY_ON_DISK)
      : LIMITS.MAX_HISTORY;
    this.now = typeof options.now === 'function' ? options.now : () => new Date();
    this.logger = options.logger;
    /** @type {Record<string, any>|null} */
    this.state = null;
    /** @type {string|null} */
    this.loadError = null;
    this.filePresent = false;
    this.writeTail = Promise.resolve();
    this.#load();
  }

  /** @returns {string} one ISO timestamp. */
  nowIso() {
    return this.#nowIso();
  }

  /** @returns {string} one ISO timestamp. */
  #nowIso() {
    const value = this.now();
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('persona clock is invalid');
    return date.toISOString();
  }

  /** Load and validate the durable document, or fail closed without overwriting it. */
  #load() {
    this.filePresent = false;
    let raw;
    try {
      const info = lstatSync(this.stateFile);
      this.filePresent = true;
      if (info.isSymbolicLink() || !info.isFile()) {
        this.loadError = 'PERSONA_STORAGE_UNSAFE';
        return;
      }
      raw = readFileSync(this.stateFile, 'utf8');
    } catch (error) {
      if (/** @type {any} */ (error)?.code === 'ENOENT') {
        this.state = makeInitialState(this.#nowIso());
        this.loadError = null;
        return;
      }
      this.loadError = 'PERSONA_STORAGE_UNAVAILABLE';
      return;
    }
    try {
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
      const parsed = JSON.parse(raw);
      this.state = validateStateDocument(parsed);
      // v0.1 documents did not carry a binding owner. Their active bindings
      // belonged to the then-selected Workspace; persist this on the next
      // mutation without rewriting the source during startup.
      this.state.bindingWorkspaceId ??= this.state.workspaceId;
      this.loadError = null;
    } catch {
      this.state = null;
      this.loadError = 'PERSONA_STORAGE_INVALID';
    }
  }

  /**
   * @returns {Record<string, any>} live state; callers must treat it as read-only.
   * @throws {PersonaStorageError} when startup validation failed.
   */
  requireState() {
    if (this.state === null) {
      throw new PersonaStorageError(
        this.loadError === 'PERSONA_STORAGE_UNSAFE'
          ? 'persona storage location is unsafe'
          : this.loadError === 'PERSONA_STORAGE_INVALID'
            ? 'persona storage is invalid and was not overwritten'
            : 'persona storage is unavailable',
      );
    }
    return this.state;
  }

  /** @returns {{status: 'ok'|'invalid'|'unavailable', filePresent: boolean, schemaVersion: number|null, revision: number|null, code: string|null}} health without a path. */
  health() {
    if (this.state === null) {
      return {
        status: this.loadError === 'PERSONA_STORAGE_UNAVAILABLE' ? 'unavailable' : 'invalid',
        filePresent: this.filePresent,
        schemaVersion: null,
        revision: null,
        code: this.loadError,
      };
    }
    return {
      status: 'ok',
      filePresent: this.filePresent,
      schemaVersion: this.state.schemaVersion,
      revision: this.state.revision,
      code: null,
    };
  }

  /** @returns {Record<string, any>} cloned mutable entity data. */
  snapshot() {
    return entityOf(this.requireState());
  }

  /**
   * Enqueue one operation behind every prior mutation.
   * @template T
   * @param {() => Promise<T>} operation operation.
   * @returns {Promise<T>} operation result.
   */
  #enqueue(operation) {
    const run = this.writeTail.then(operation);
    this.writeTail = run.then(() => undefined, () => undefined);
    return run;
  }

  /**
   * Apply one revision-checked mutation and atomically commit it.
   * @param {number} expectedRevision caller's expected global revision.
   * @param {{action: string, changes: {kind: string, id?: string}}} descriptor history descriptor.
   * @param {(draft: Record<string, any>) => Promise<unknown>|unknown} mutator mutation.
   * @returns {Promise<{state: Record<string, any>, result: unknown, historyId: string}>} committed state and mutation result.
   */
  async mutate(expectedRevision, descriptor, mutator) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new PersonaValidationError('expectedRevision must be a non-negative integer');
    }
    if (!isObject(descriptor) || typeof descriptor.action !== 'string' || !isObject(descriptor.changes)) {
      throw new TypeError('persona mutation descriptor is invalid');
    }
    return await this.#enqueue(async () => {
      const current = this.requireState();
      if (current.revision !== expectedRevision) throw new PersonaConflictError(current.revision);
      const draft = entityOf(current);
      const result = await mutator(draft);
      if (draft.bindingWorkspaceId == null) draft.bindingWorkspaceId = draft.workspaceId;
      // Keep the backup and Workspace switch in the same write queue. A failed
      // backup prevents the new Workspace from inheriting an unarchived binding.
      const backup = descriptor.backupOnWorkspaceChange
        && current.workspaceId !== draft.workspaceId
        && Object.keys(current.bindings).length > 0
        ? await this.#writeBackup(current, 'workspace-switch')
        : null;
      const now = this.#nowIso();
      const historyEntry = {
        id: `hist-${randomUUID()}`,
        revision: current.revision,
        at: now,
        action: descriptor.action,
        changes: structuredClone(descriptor.changes),
        data: entityOf(current),
      };
      const next = {
        ...current,
        ...draft,
        revision: current.revision + 1,
        updatedAt: now,
        history: [...current.history, historyEntry].slice(-this.maxHistory),
      };
      validateStateDocument(next, { maxHistory: LIMITS.MAX_HISTORY_ON_DISK });
      await this.#persistState(next);
      this.state = next;
      this.filePresent = true;
      return { state: next, result, historyId: historyEntry.id, backup };
    });
  }

  /**
   * @param {Record<string, any>} state validated state.
   * @returns {Promise<void>} completion after atomic replacement.
   */
  async #persistState(state) {
    const body = `${JSON.stringify(state, null, 2)}\n`;
    await writeFileAtomic(this.stateFile, body);
    try {
      await this.#syncMarkdown(state);
      this.markdownError = false;
    } catch {
      // The committed JSON revision remains authoritative. A failed mirror
      // cannot turn a successful mutation into a false 500/conflict response.
      this.markdownError = true;
    }
  }

  /**
   * Materialize the one SOUL.md and stable-ID STYLE.md files for inspection
   * and export. These are atomic projections of persona.json, never a second
   * editable source of truth.
   * @param {Record<string, any>} state validated committed state.
   */
  async #syncMarkdown(state) {
    const stylesDirectory = join(this.directory, STYLES_DIR);
    await mkdir(stylesDirectory, { recursive: true, mode: 0o700 });
    const info = await lstat(stylesDirectory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new PersonaStorageError('persona styles directory is unsafe');
    await writeFileAtomic(join(this.directory, CORE_FILE), state.core.body);
    const expected = new Set();
    for (const style of Object.values(state.styles)) {
      const filename = `${style.id}.md`;
      expected.add(filename);
      await writeFileAtomic(join(stylesDirectory, filename), style.body);
    }
    for (const entry of await readdir(stylesDirectory, { withFileTypes: true })) {
      if (entry.isFile() && /^style-[0-9a-f-]{36}\.md$/.test(entry.name) && !expected.has(entry.name)) {
        await rm(join(stylesDirectory, entry.name));
      }
    }
  }

  /**
   * Ensure the backup directory is a real directory, not a symlink.
   * @returns {Promise<void>} completion.
   */
  async #ensureBackupsDirectory() {
    await mkdir(this.backupsDirectory, { recursive: true, mode: 0o700 });
    const info = await lstat(this.backupsDirectory);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new PersonaStorageError('persona backup directory is unsafe');
    }
  }

  /**
   * Write one backup wrapper for a complete state.
   * @param {Record<string, any>} state validated state.
   * @param {string} reason safe reason label.
   * @returns {Promise<Record<string, any>>} backup metadata.
   */
  async #writeBackup(state, reason) {
    await this.#ensureBackupsDirectory();
    const id = `backup-${Date.now().toString(36)}-${randomBytes(5).toString('hex')}.json`;
    const backup = {
      format: BACKUP_FORMAT,
      backupVersion: BACKUP_VERSION,
      id,
      createdAt: this.#nowIso(),
      reason: normalizeReason(reason),
      state: structuredClone(state),
    };
    validateBackupDocument(backup);
    const body = `${JSON.stringify(backup, null, 2)}\n`;
    await writeFileAtomic(join(this.backupsDirectory, id), body);
    return {
      id,
      createdAt: backup.createdAt,
      reason: backup.reason,
      revision: backup.state.revision,
      bytes: Buffer.byteLength(body),
    };
  }

  /**
   * Create a manual backup of the current state.
   * @param {string} [reason] owner-facing reason.
   * @param {number|null} [expectedRevision] optional optimistic lock checked inside the queue.
   * @returns {Promise<Record<string, any>>} backup metadata.
   */
  async createBackup(reason = 'manual', expectedRevision = null) {
    return await this.#enqueue(async () => {
      const state = this.requireState();
      if (expectedRevision !== null && state.revision !== expectedRevision) {
        throw new PersonaConflictError(state.revision);
      }
      return await this.#writeBackup(state, reason);
    });
  }

  /**
   * Read and fully validate one backup inside the backup directory.
   * @param {string} backupId backup filename.
   * @returns {Promise<Record<string, any>>} validated backup.
   */
  async #readBackup(backupId) {
    if (typeof backupId !== 'string' || !BACKUP_NAME.test(backupId)) {
      throw new PersonaNotFoundError('backup was not found');
    }
    const target = join(this.backupsDirectory, backupId);
    let info;
    try {
      info = await lstat(target);
    } catch (error) {
      if (/** @type {any} */ (error)?.code === 'ENOENT') throw new PersonaNotFoundError('backup was not found');
      throw new PersonaStorageError('persona backup is unavailable');
    }
    if (info.isSymbolicLink() || !info.isFile()) throw new PersonaStorageError('persona backup location is unsafe');
    let raw;
    try {
      raw = await readFile(target, 'utf8');
    } catch {
      throw new PersonaStorageError('persona backup is unavailable');
    }
    try {
      const backup = validateBackupDocument(JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw));
      if (backup.id !== backupId) throw new PersonaValidationError('backup id is inconsistent');
      return backup;
    } catch (error) {
      if (error instanceof PersonaNotFoundError) throw error;
      throw new PersonaValidationError('backup is invalid and cannot be restored');
    }
  }

  /**
   * List valid backups without exposing filesystem paths.
   * @returns {Promise<{backups: Record<string, any>[], invalidCount: number}>} listing.
   */
  async listBackups() {
    let entries;
    try {
      entries = await readdir(this.backupsDirectory, { withFileTypes: true });
    } catch (error) {
      if (/** @type {any} */ (error)?.code === 'ENOENT') return { backups: [], invalidCount: 0 };
      throw new PersonaStorageError('persona backups are unavailable');
    }
    const backups = [];
    let invalidCount = 0;
    for (const entry of entries) {
      if (!entry.isFile() || !BACKUP_NAME.test(entry.name)) continue;
      try {
        const info = await lstat(join(this.backupsDirectory, entry.name));
        if (!info.isFile()) {
          invalidCount += 1;
          continue;
        }
        const raw = await readFile(join(this.backupsDirectory, entry.name), 'utf8');
        const backup = validateBackupDocument(JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw));
        if (backup.id !== entry.name) {
          invalidCount += 1;
          continue;
        }
        backups.push({
          id: backup.id,
          createdAt: backup.createdAt,
          reason: backup.reason,
          revision: backup.state.revision,
          bytes: info.size,
        });
      } catch {
        invalidCount += 1;
      }
    }
    backups.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))
      || right.id.localeCompare(left.id));
    return { backups, invalidCount };
  }

  /**
   * Restore one validated backup.  A safety backup of the current state is
   * written first; the restored state keeps current history and appends the
   * prior state, so the restore itself is reversible.
   * @param {string} backupId backup filename.
   * @param {number} expectedRevision caller's expected global revision.
   * @returns {Promise<{state: Record<string, any>, result: Record<string, any>}>} restored state and metadata.
   */
  async restore(backupId, expectedRevision) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new PersonaValidationError('expectedRevision must be a non-negative integer');
    }
    return await this.#enqueue(async () => {
      const current = this.requireState();
      if (current.revision !== expectedRevision) throw new PersonaConflictError(current.revision);
      const backup = await this.#readBackup(backupId);
      const safety = await this.#writeBackup(current, 'pre-restore');
      const now = this.#nowIso();
      const draft = entityOf(current);
      const restored = backup.state;

      if (draft.core.body !== restored.core.body) {
        draft.core = {
          body: restored.core.body,
          revision: draft.core.revision + 1,
          createdAt: draft.core.createdAt,
          updatedAt: now,
        };
      }

      /** @type {Record<string, any>} */
      const nextStyles = {};
      for (const [id, style] of Object.entries(restored.styles)) {
        const existing = draft.styles[id];
        const changed = existing === undefined
          || existing.name !== style.name
          || existing.description !== style.description
          || existing.body !== style.body
          || existing.color !== style.color;
        nextStyles[id] = changed
          ? {
            ...style,
            revision: (existing?.revision ?? 0) + 1,
            createdAt: existing?.createdAt ?? style.createdAt,
            updatedAt: now,
          }
          : existing;
      }
      draft.styles = nextStyles;
      draft.defaultStyleId = restored.defaultStyleId;
      draft.workspaceId = restored.workspaceId;
      draft.bindingWorkspaceId = restored.bindingWorkspaceId ?? restored.workspaceId;
      draft.injectionEnabled = restored.injectionEnabled;

      /** @type {Record<string, any>} */
      const nextBindings = {};
      for (const [key, binding] of Object.entries(restored.bindings)) {
        const existing = draft.bindings[key];
        const changed = existing === undefined
          || existing.kind !== binding.kind
          || existing.mode !== binding.mode
          || existing.styleId !== binding.styleId
          || existing.sessionId !== binding.sessionId
          || JSON.stringify(existing.scene) !== JSON.stringify(binding.scene);
        nextBindings[key] = changed
          ? {
            ...structuredClone(binding),
            revision: (existing?.revision ?? 0) + 1,
            createdAt: existing?.createdAt ?? binding.createdAt,
            updatedAt: now,
          }
          : existing;
      }
      draft.bindings = nextBindings;

      const historyEntry = {
        id: `hist-${randomUUID()}`,
        revision: current.revision,
        at: now,
        action: 'restore',
        changes: { kind: 'restore' },
        data: entityOf(current),
      };
      const next = {
        ...current,
        ...draft,
        revision: current.revision + 1,
        updatedAt: now,
        history: [...current.history, historyEntry].slice(-this.maxHistory),
      };
      validateStateDocument(next, { maxHistory: LIMITS.MAX_HISTORY_ON_DISK });
      await this.#persistState(next);
      this.state = next;
      this.filePresent = true;
      return {
        state: next,
        result: {
          backupId,
          safetyBackupId: safety.id,
          restoredRevision: backup.state.revision,
          revision: next.revision,
        },
      };
    });
  }

  /**
   * Build history entries for one card without exposing other cards' content.
   * @param {'core'|'style'} cardType card kind.
   * @param {string|null} cardId style id, or null for core.
   * @returns {Record<string, any>[]} newest-first history.
   */
  historyForCard(cardType, cardId) {
    const state = this.requireState();
    const entries = [];
    for (const entry of [...state.history].reverse()) {
      const relevant = entry.changes.kind === 'restore'
        ? true
        : cardType === 'core'
          ? entry.changes.kind === 'core'
          : entry.changes.kind === 'style' && entry.changes.id === cardId;
      if (!relevant) continue;
      const snapshot = cardType === 'core'
        ? entry.data.core
        : cardId === null ? undefined : entry.data.styles[cardId];
      if (snapshot === undefined) continue;
      entries.push({
        historyId: entry.id,
        revision: entry.revision,
        at: entry.at,
        action: entry.action,
        cardRevision: snapshot.revision,
        snapshot: cardType === 'core'
          ? { body: snapshot.body }
          : {
            name: snapshot.name,
            description: snapshot.description,
            body: snapshot.body,
            color: snapshot.color,
          },
      });
    }
    return entries;
  }

  /**
   * Find one history snapshot for rollback.
   * @param {string} historyId history id.
   * @returns {Record<string, any>} history entry.
   */
  findHistory(historyId) {
    const state = this.requireState();
    const entry = state.history.find(candidate => candidate.id === historyId);
    if (entry === undefined) throw new PersonaNotFoundError('history entry was not found');
    return entry;
  }

  /**
   * Build owner-facing token warnings for the whole assembled persona.
   * @returns {string[]} warning codes.
   */
  warnings() {
    const state = this.requireState();
    const warnings = [];
    if (this.markdownError) warnings.push('PERSONA_MARKDOWN_PROJECTION_UNAVAILABLE');
    if (tokenMetadata(state.core.body, 'core').tokenWarning) warnings.push('PERSONA_TOKEN_WARNING');
    for (const style of Object.values(state.styles)) {
      if (tokenMetadata(style.body, 'style').tokenWarning) {
        warnings.push('PERSONA_TOKEN_WARNING');
        break;
      }
    }
    return warnings;
  }

  /**
   * Expose a safe file label for tests and logs; never used by the HTTP API.
   * @returns {string} file basename.
   */
  get stateFileName() {
    return STATE_FILE;
  }
}
