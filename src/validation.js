/**
 * Validation, bounds and stable identities for Persona state.
 *
 * Persona text is administrator configuration.  Every value persisted to the
 * independent JSON file passes through these checks on write and again on read;
 * corrupt or incomplete data therefore never becomes an injected prompt.
 */

import { PersonaValidationError } from './errors.js';

export const SCHEMA_VERSION = 1;
export const BACKUP_FORMAT = 'amadeus-persona-backup';
export const BACKUP_VERSION = 1;

export const LIMITS = Object.freeze({
  CORE_MAX_CHARS: 20_000,
  STYLE_BODY_MAX_CHARS: 12_000,
  STYLE_NAME_MAX_CHARS: 80,
  STYLE_DESCRIPTION_MAX_CHARS: 500,
  CORE_WARN_TOKENS: 3_000,
  STYLE_WARN_TOKENS: 2_000,
  MAX_HISTORY: 50,
  MAX_HISTORY_ON_DISK: 200,
  MAX_STYLES: Number.MAX_SAFE_INTEGER,
  MAX_BACKUP_REASON_CHARS: 80,
});

export const BINDING_MODES = Object.freeze(['inherit', 'core-only', 'style', 'disabled']);
export const HISTORY_KINDS = Object.freeze([
  'core', 'style', 'binding', 'workspace', 'default-style', 'settings', 'restore',
]);
export const DEFAULT_STYLE_COLOR = '#6b7280';

const STYLE_ID_PATTERN = /^style-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HISTORY_ID_PATTERN = /^hist-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const SCENE_PART_PATTERN = /^[^\s:]{1,128}$/;

/**
 * Count code points, not UTF-16 code units, so an emoji is one configured
 * character rather than two.
 * @param {string} value text.
 * @returns {number} code-point count.
 */
export function characterCount(value) {
  let count = 0;
  for (const _ of value) count += 1;
  return count;
}

/**
 * A deliberately conservative token estimate: ASCII at four characters per
 * token and non-ASCII at one token per character.  It is used only for warning
 * metadata, never to reject text; hard limits are character counts.
 * @param {string} value text.
 * @returns {number} estimated tokens.
 */
export function estimateTokens(value) {
  if (value.length === 0) return 0;
  let ascii = 0;
  let wide = 0;
  for (const character of value) {
    if ((character.codePointAt(0) ?? 0) < 0x80) ascii += 1;
    else wide += 1;
  }
  return Math.ceil(ascii / 4 + wide);
}

/**
 * Build warning metadata for one prompt card.
 * @param {string} body card body.
 * @param {'core'|'style'} kind card kind.
 * @returns {{characters: number, estimatedTokens: number, tokenWarning: boolean, warningTokens: number}} metadata.
 */
export function tokenMetadata(body, kind) {
  const estimatedTokens = estimateTokens(body);
  const warningTokens = kind === 'core' ? LIMITS.CORE_WARN_TOKENS : LIMITS.STYLE_WARN_TOKENS;
  return {
    characters: characterCount(body),
    estimatedTokens,
    tokenWarning: estimatedTokens > warningTokens,
    warningTokens,
  };
}

/**
 * @param {unknown} value candidate.
 * @returns {value is Record<string, unknown>} whether this is a plain JSON object.
 */
export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value candidate.
 * @param {string} field field name for the message.
 * @returns {Record<string, unknown>} the object.
 */
export function requireObject(value, field) {
  if (!isPlainObject(value)) throw new PersonaValidationError(`${field} must be an object`);
  return value;
}

/**
 * Require exactly the named keys.
 * @param {Record<string, unknown>} object object.
 * @param {readonly string[]} required required keys.
 * @param {readonly string[]} [optional] optional keys.
 * @param {string} label object label.
 */
export function requireExactKeys(object, required, optional, label) {
  const allowed = new Set([...required, ...(optional ?? [])]);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) throw new PersonaValidationError(`${label} has an unexpected field`);
  }
  for (const key of required) {
    if (!Object.hasOwn(object, key)) throw new PersonaValidationError(`${label} is missing a required field`);
  }
}

/**
 * Require a string within code-point bounds.
 * @param {unknown} value candidate.
 * @param {string} field field name.
 * @param {{min?: number, max: number, allowEmpty?: boolean, singleLine?: boolean}} options bounds.
 * @returns {string} original string.
 */
export function requireText(value, field, options) {
  if (typeof value !== 'string') throw new PersonaValidationError(`${field} must be a string`);
  const count = characterCount(value);
  if (!options.allowEmpty && value.trim().length === 0) {
    throw new PersonaValidationError(`${field} must not be empty`);
  }
  if (count < (options.min ?? 0)) {
    throw new PersonaValidationError(`${field} is too short (${count} characters, minimum ${options.min})`);
  }
  if (count > options.max) {
    throw new PersonaValidationError(`${field} is too large (${count} characters, maximum ${options.max})`);
  }
  if (options.singleLine && CONTROL_PATTERN.test(value)) {
    throw new PersonaValidationError(`${field} must not contain control characters`);
  }
  return value;
}

/**
 * Normalize line endings so the same authored text has one durable spelling.
 * @param {string} value text.
 * @returns {string} normalized text.
 */
export function normalizeText(value) {
  return value.replace(/\r\n?/g, '\n');
}

/**
 * Validate and normalize one core body.
 * @param {unknown} body candidate.
 * @returns {string} normalized body.
 */
export function validateCoreBody(body) {
  const value = requireText(body, 'core body', {
    max: LIMITS.CORE_MAX_CHARS,
    allowEmpty: true,
  });
  return normalizeText(value);
}

/**
 * Validate one style body.
 * @param {unknown} body candidate.
 * @returns {string} normalized body.
 */
export function validateStyleBody(body) {
  const value = requireText(body, 'style body', {
    max: LIMITS.STYLE_BODY_MAX_CHARS,
    allowEmpty: false,
  });
  return normalizeText(value);
}

/**
 * @param {unknown} name candidate.
 * @returns {string} trimmed name.
 */
export function validateStyleName(name) {
  return requireText(name, 'style name', {
    min: 1,
    max: LIMITS.STYLE_NAME_MAX_CHARS,
    allowEmpty: false,
    singleLine: true,
  }).trim();
}

/**
 * @param {unknown} description candidate.
 * @returns {string} trimmed description.
 */
export function validateStyleDescription(description) {
  const value = description === undefined || description === null ? '' : description;
  return requireText(value, 'style description', {
    max: LIMITS.STYLE_DESCRIPTION_MAX_CHARS,
    allowEmpty: true,
    singleLine: true,
  }).trim();
}

/**
 * @param {unknown} color candidate.
 * @returns {string} lower-case #rrggbb.
 */
export function validateStyleColor(color) {
  if (color === undefined || color === null || color === '') return DEFAULT_STYLE_COLOR;
  if (typeof color !== 'string' || !COLOR_PATTERN.test(color)) {
    throw new PersonaValidationError('style color must be a #rrggbb value');
  }
  return color.toLowerCase();
}

/**
 * @param {unknown} value candidate.
 * @param {string} field field name.
 * @returns {string} stable style id.
 */
export function validateStyleId(value, field = 'style id') {
  if (typeof value !== 'string' || !STYLE_ID_PATTERN.test(value)) {
    throw new PersonaValidationError(`${field} is invalid`);
  }
  return value;
}

/**
 * @param {unknown} value candidate.
 * @returns {string} ISO-8601 UTC timestamp.
 */
export function requireIsoTimestamp(value, field = 'timestamp') {
  if (typeof value !== 'string' || !ISO_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new PersonaValidationError(`${field} must be an ISO-8601 UTC timestamp`);
  }
  return value;
}

/**
 * @param {unknown} value candidate.
 * @returns {number} non-negative safe integer.
 */
export function requireRevision(value, field = 'revision') {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PersonaValidationError(`${field} must be a non-negative integer`);
  }
  return value;
}

/**
 * @param {unknown} value candidate.
 * @param {string} field field name.
 * @returns {string} opaque bounded identity.
 */
export function requireIdentity(value, field) {
  if (typeof value !== 'string' || value.length === 0 || characterCount(value) > 200 || CONTROL_PATTERN.test(value)) {
    throw new PersonaValidationError(`${field} is invalid`);
  }
  return value;
}

/**
 * Build the stable key for a QQ Scene.  Both bot and peer identities are part
 * of the key: a peer id without its bot id is never a Scene identity.
 * @param {{kind: 'group'|'private', botId: string, peerId: string}} scene verified scene.
 * @returns {string} stable key.
 */
export function qqSceneKey(scene) {
  if (scene?.kind !== 'group' && scene?.kind !== 'private') {
    throw new PersonaValidationError('QQ Scene kind must be group or private');
  }
  if (typeof scene.botId !== 'string' || !SCENE_PART_PATTERN.test(scene.botId)) {
    throw new PersonaValidationError('QQ Scene botId is invalid');
  }
  if (typeof scene.peerId !== 'string' || !SCENE_PART_PATTERN.test(scene.peerId)) {
    throw new PersonaValidationError('QQ Scene peerId is invalid');
  }
  return `qq:${scene.kind}:${scene.botId}:${scene.peerId}`;
}

/**
 * Build the stable key for an ordinary DSH Session binding.
 * @param {string} sessionId stable DSH Session id.
 * @returns {string} stable key.
 */
export function sessionBindingKey(sessionId) {
  return `session:${requireIdentity(sessionId, 'Session id')}`;
}

/**
 * Validate a binding mode and its style reference.
 * @param {unknown} mode candidate.
 * @param {unknown} styleId candidate.
 * @param {Record<string, unknown>} styles known styles.
 * @returns {{mode: string, styleId: string|null}} normalized binding target.
 */
export function validateBindingMode(mode, styleId, styles) {
  if (!BINDING_MODES.includes(mode)) {
    throw new PersonaValidationError(`binding mode must be one of ${BINDING_MODES.join(', ')}`);
  }
  if (mode === 'style') {
    const id = validateStyleId(styleId, 'binding styleId');
    if (!Object.hasOwn(styles, id)) throw new PersonaValidationError('binding style does not exist');
    return { mode, styleId: id };
  }
  if (styleId !== undefined && styleId !== null) {
    throw new PersonaValidationError('only a style binding may name a styleId');
  }
  return { mode, styleId: null };
}

/**
 * @param {Record<string, unknown>} value binding object.
 * @param {Record<string, unknown>} styles known styles.
 * @returns {void}
 */
function validateBinding(value, styles) {
  requireObject(value, 'binding');
  requireExactKeys(value, ['key', 'kind', 'mode', 'styleId', 'revision', 'createdAt', 'updatedAt'], ['sessionId', 'scene'], 'binding');
  requireIdentity(value.key, 'binding key');
  if (value.kind !== 'session' && value.kind !== 'qq') {
    throw new PersonaValidationError('binding kind must be session or qq');
  }
  const target = validateBindingMode(value.mode, value.styleId, styles);
  if (target.mode === 'style' && target.styleId !== value.styleId) {
    throw new PersonaValidationError('binding styleId is invalid');
  }
  requireRevision(value.revision, 'binding revision');
  requireIsoTimestamp(value.createdAt, 'binding createdAt');
  requireIsoTimestamp(value.updatedAt, 'binding updatedAt');
  if (value.kind === 'session') {
    if (!Object.hasOwn(value, 'sessionId') || Object.hasOwn(value, 'scene')) {
      throw new PersonaValidationError('session binding shape is invalid');
    }
    const sessionId = requireIdentity(value.sessionId, 'binding sessionId');
    if (value.key !== sessionBindingKey(sessionId)) {
      throw new PersonaValidationError('session binding key is inconsistent');
    }
    return;
  }
  if (!Object.hasOwn(value, 'scene') || Object.hasOwn(value, 'sessionId')) {
    throw new PersonaValidationError('QQ binding shape is invalid');
  }
  const scene = requireObject(value.scene, 'binding scene');
  requireExactKeys(scene, ['kind', 'botId', 'peerId'], [], 'binding scene');
  if (value.key !== qqSceneKey(/** @type {{kind: 'group'|'private', botId: string, peerId: string}} */ (scene))) {
    throw new PersonaValidationError('QQ binding key is inconsistent');
  }
}

/**
 * @param {Record<string, unknown>} value style object.
 * @returns {void}
 */
function validateStyle(value) {
  requireObject(value, 'style');
  requireExactKeys(
    value,
    ['id', 'name', 'description', 'body', 'color', 'revision', 'createdAt', 'updatedAt'],
    [],
    'style',
  );
  const id = validateStyleId(value.id, 'style id');
  validateStyleName(value.name);
  validateStyleDescription(value.description);
  validateStyleBody(value.body);
  if (typeof value.color !== 'string' || !COLOR_PATTERN.test(value.color)) {
    throw new PersonaValidationError('style color must be a #rrggbb value');
  }
  requireRevision(value.revision, 'style revision');
  requireIsoTimestamp(value.createdAt, 'style createdAt');
  requireIsoTimestamp(value.updatedAt, 'style updatedAt');
  if (id !== value.id) throw new PersonaValidationError('style id is invalid');
}

/**
 * @param {Record<string, unknown>} value core object.
 * @returns {void}
 */
function validateCore(value) {
  requireObject(value, 'core');
  requireExactKeys(value, ['body', 'revision', 'createdAt', 'updatedAt'], [], 'core');
  validateCoreBody(value.body);
  requireRevision(value.revision, 'core revision');
  requireIsoTimestamp(value.createdAt, 'core createdAt');
  requireIsoTimestamp(value.updatedAt, 'core updatedAt');
}

/**
 * Validate the mutable entity data, shared by live state and history snapshots.
 * @param {unknown} value candidate.
 * @returns {{core: Record<string, unknown>, styles: Record<string, unknown>, defaultStyleId: string|null, workspaceId: string|null, injectionEnabled: boolean, bindings: Record<string, unknown>}} validated data.
 */
export function validateEntityData(value) {
  const data = requireObject(value, 'persona data');
  requireExactKeys(
    data,
    ['core', 'styles', 'defaultStyleId', 'workspaceId', 'injectionEnabled', 'bindings'],
    [],
    'persona data',
  );
  validateCore(requireObject(data.core, 'core'));
  const styles = requireObject(data.styles, 'styles');
  for (const [id, style] of Object.entries(styles)) {
    validateStyle(requireObject(style, 'style'));
    if (style.id !== id) throw new PersonaValidationError('style store key is inconsistent');
  }
  if (data.defaultStyleId !== null) {
    validateStyleId(data.defaultStyleId, 'defaultStyleId');
    if (!Object.hasOwn(styles, data.defaultStyleId)) {
      throw new PersonaValidationError('default style does not exist');
    }
  }
  if (data.workspaceId !== null) requireIdentity(data.workspaceId, 'workspaceId');
  if (typeof data.injectionEnabled !== 'boolean') {
    throw new PersonaValidationError('injectionEnabled must be a boolean');
  }
  const bindings = requireObject(data.bindings, 'bindings');
  for (const [key, binding] of Object.entries(bindings)) {
    validateBinding(requireObject(binding, 'binding'), styles);
    if (binding.key !== key) throw new PersonaValidationError('binding store key is inconsistent');
  }
  return {
    core: data.core,
    styles,
    defaultStyleId: data.defaultStyleId,
    workspaceId: data.workspaceId,
    injectionEnabled: data.injectionEnabled,
    bindings,
  };
}

/**
 * @param {Record<string, unknown>} value history entry.
 * @param {number} revision current state revision.
 * @returns {void}
 */
function validateHistoryEntry(value, revision) {
  requireObject(value, 'history entry');
  requireExactKeys(value, ['id', 'revision', 'at', 'action', 'changes', 'data'], [], 'history entry');
  if (typeof value.id !== 'string' || !HISTORY_ID_PATTERN.test(value.id)) {
    throw new PersonaValidationError('history id is invalid');
  }
  const entryRevision = requireRevision(value.revision, 'history revision');
  if (entryRevision >= revision) throw new PersonaValidationError('history revision is not prior to current state');
  requireIsoTimestamp(value.at, 'history timestamp');
  requireText(value.action, 'history action', { min: 1, max: 100, allowEmpty: false, singleLine: true });
  const changes = requireObject(value.changes, 'history changes');
  requireExactKeys(changes, ['kind'], ['id'], 'history changes');
  if (!HISTORY_KINDS.includes(changes.kind)) {
    throw new PersonaValidationError('history change kind is invalid');
  }
  if (changes.kind === 'style' || changes.kind === 'binding') {
    if (!Object.hasOwn(changes, 'id')) throw new PersonaValidationError('history change id is required');
    requireIdentity(changes.id, 'history change id');
  } else if (Object.hasOwn(changes, 'id')) {
    throw new PersonaValidationError('history change id is not allowed');
  }
  validateEntityData(requireObject(value.data, 'history data'));
}

/**
 * Validate one complete durable Persona document.
 * @param {unknown} value candidate.
 * @param {{maxHistory?: number}} [options] validation bounds.
 * @returns {Record<string, any>} validated document.
 */
export function validateStateDocument(value, options = {}) {
  const state = requireObject(value, 'persona state');
  requireExactKeys(
    state,
    [
      'schemaVersion', 'revision', 'createdAt', 'updatedAt', 'core', 'styles', 'defaultStyleId',
      'workspaceId', 'injectionEnabled', 'bindings', 'history',
    ],
    [],
    'persona state',
  );
  if (state.schemaVersion !== SCHEMA_VERSION) throw new PersonaValidationError('unsupported persona schema version');
  const revision = requireRevision(state.revision);
  requireIsoTimestamp(state.createdAt, 'createdAt');
  requireIsoTimestamp(state.updatedAt, 'updatedAt');
  validateEntityData({
    core: state.core,
    styles: state.styles,
    defaultStyleId: state.defaultStyleId,
    workspaceId: state.workspaceId,
    injectionEnabled: state.injectionEnabled,
    bindings: state.bindings,
  });
  const history = state.history;
  if (!Array.isArray(history)) throw new PersonaValidationError('history must be an array');
  const maxHistory = options.maxHistory ?? LIMITS.MAX_HISTORY_ON_DISK;
  if (history.length > maxHistory) throw new PersonaValidationError('history is too large');
  const seen = new Set();
  for (const entry of history) {
    validateHistoryEntry(requireObject(entry, 'history entry'), revision);
    if (seen.has(entry.id)) throw new PersonaValidationError('history id is duplicated');
    seen.add(entry.id);
  }
  return state;
}

/**
 * Validate a backup wrapper and its embedded state.
 * @param {unknown} value candidate.
 * @returns {Record<string, any>} validated backup.
 */
export function validateBackupDocument(value) {
  const backup = requireObject(value, 'backup');
  requireExactKeys(backup, ['format', 'backupVersion', 'id', 'createdAt', 'reason', 'state'], [], 'backup');
  if (backup.format !== BACKUP_FORMAT) throw new PersonaValidationError('backup format is unsupported');
  if (backup.backupVersion !== BACKUP_VERSION) throw new PersonaValidationError('backup version is unsupported');
  if (typeof backup.id !== 'string' || !/^backup-[a-z0-9-]{8,80}\.json$/.test(backup.id)) {
    throw new PersonaValidationError('backup id is invalid');
  }
  requireIsoTimestamp(backup.createdAt, 'backup createdAt');
  requireText(backup.reason, 'backup reason', {
    max: LIMITS.MAX_BACKUP_REASON_CHARS,
    allowEmpty: true,
    singleLine: true,
  });
  validateStateDocument(backup.state);
  return backup;
}

/**
 * Build one style record.
 * @param {{id: string, name: string, description: string, body: string, color: string, now: string}} input values.
 * @returns {Record<string, unknown>} style.
 */
export function makeStyle({ id, name, description, body, color, now }) {
  return {
    id: validateStyleId(id),
    name: validateStyleName(name),
    description: validateStyleDescription(description),
    body: validateStyleBody(body),
    color: validateStyleColor(color),
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Build a fresh empty store.  It is intentionally not written to disk until
 * the first explicit mutation, so an empty install has no demo persona and no
 * injected content.
 * @param {string} now ISO timestamp.
 * @returns {Record<string, unknown>} initial document.
 */
export function makeInitialState(now) {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    core: {
      body: '',
      revision: 0,
      createdAt: now,
      updatedAt: now,
    },
    styles: {},
    defaultStyleId: null,
    workspaceId: null,
    injectionEnabled: true,
    bindings: {},
    history: [],
  };
}

/**
 * Convert stored style text into a bounded owner-facing view.
 * @param {Record<string, any>} style style record.
 * @returns {Record<string, unknown>} view.
 */
export function styleView(style) {
  const token = tokenMetadata(style.body, 'style');
  return {
    id: style.id,
    name: style.name,
    description: style.description,
    body: style.body,
    color: style.color,
    revision: style.revision,
    createdAt: style.createdAt,
    updatedAt: style.updatedAt,
    token: token,
    warnings: token.tokenWarning ? ['PERSONA_TOKEN_WARNING'] : [],
  };
}

/**
 * Convert the core record into an owner-facing view.
 * @param {Record<string, any>} core core record.
 * @returns {Record<string, unknown>} view.
 */
export function coreView(core) {
  const token = tokenMetadata(core.body, 'core');
  return {
    body: core.body,
    revision: core.revision,
    createdAt: core.createdAt,
    updatedAt: core.updatedAt,
    token: token,
    warnings: token.tokenWarning ? ['PERSONA_TOKEN_WARNING'] : [],
  };
}

/**
 * Public limits metadata.
 * @returns {Record<string, number>} limits.
 */
export function publicLimits() {
  return {
    coreMaxChars: LIMITS.CORE_MAX_CHARS,
    styleBodyMaxChars: LIMITS.STYLE_BODY_MAX_CHARS,
    styleNameMaxChars: LIMITS.STYLE_NAME_MAX_CHARS,
    styleDescriptionMaxChars: LIMITS.STYLE_DESCRIPTION_MAX_CHARS,
    coreWarnTokens: LIMITS.CORE_WARN_TOKENS,
    styleWarnTokens: LIMITS.STYLE_WARN_TOKENS,
  };
}
