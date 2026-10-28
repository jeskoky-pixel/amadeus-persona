/**
 * Persona domain service: trusted Workspace/QQ-Scene resolution, revisioned
 * card and binding mutations, backup/restore, and sanitized diagnostics.
 *
 * Trust is re-derived on every prompt assembly from the live Agent Session,
 * the current Workspace membership list, and (only when available) the QQ Host
 * Scene contract.  Nothing supplied by a browser, a model, a Session title or a
 * preset name is treated as authorization.
 */

import { randomUUID } from 'node:crypto';
import { formatPersonaSection } from './section-text.js';
import {
  BINDING_MODES,
  LIMITS,
  coreView,
  isPlainObject,
  publicLimits,
  qqSceneKey,
  requireExactKeys,
  requireIdentity,
  requireObject,
  sessionBindingKey,
  styleView,
  validateBindingMode,
  validateCoreBody,
  validateStyleColor,
  validateStyleDescription,
  validateStyleId,
  validateStyleName,
  validateStyleBody,
  makeStyle,
} from './validation.js';
import {
  PersonaError,
  PersonaNotFoundError,
  PersonaUnavailableError,
  PersonaValidationError,
} from './errors.js';

const MAX_RECENT_ASSEMBLIES = 100;
const MAX_DISCOVERED_SCENES = 200;

/**
 * @param {unknown} value candidate.
 * @returns {Record<string, any>|null} plain object or null.
 */function objectOrNull(value) {
  return isPlainObject(value) ? value : null;
}

/**
 * @param {unknown} scene raw QQ Scene from the Host service.
 * @returns {{kind: 'group'|'private', botId: string, peerId: string}|null} validated scene identity.
 */
export function normalizeTrustedQqScene(scene) {
  if (!isPlainObject(scene)) return null;
  if (scene.platform !== 'qq' || scene.verified !== true) return null;
  if (scene.kind !== 'group' && scene.kind !== 'private') return null;
  if (typeof scene.id !== 'string') return null;
  const separator = scene.id.indexOf(':');
  if (separator <= 0 || separator === scene.id.length - 1) return null;
  const botId = scene.id.slice(0, separator);
  const peerId = scene.id.slice(separator + 1);
  if (botId.length === 0 || peerId.length === 0) return null;
  const normalized = { kind: scene.kind, botId, peerId };
  try {
    qqSceneKey(normalized);
  } catch {
    return null;
  }
  return normalized;
}

function normalizeAuthorizedQqScene(entry, workspaceId) {
  if (!isPlainObject(entry) || entry.authorized !== true || entry.workspaceId !== workspaceId) return null;
  return normalizeTrustedQqScene({ ...entry, verified: true });
}

/**
 * @param {Record<string, any>} header Session header.
 * @returns {boolean} whether the header is a known QQ preset.
 */
function isKnownQqPreset(header) {
  return typeof header?.agentPreset === 'string' && header.agentPreset.startsWith('amadeus-qq');
}

export class PersonaService {
  /**
   * @param {{
   *   store: import('./store.js').PersonaStore,
   *   getWorkspaceRegistry?: () => Record<string, any>|undefined,
   *   getQq?: () => Record<string, any>|undefined,
   *   getSessionHeader?: (sessionId: string) => Record<string, any>|undefined,
   *   getMemory?: () => Record<string, any>|undefined,
   *   getAgent?: (sessionId: string) => Record<string, any>|undefined,
   *   assemblePrompt?: (agent: Record<string, any>) => Promise<Record<string, any>>,
   * }} options service dependencies.
   */
  constructor(options) {
    if (!isPlainObject(options) || !isPlainObject(options.store)) {
      throw new TypeError('PersonaService requires a PersonaStore');
    }
    this.store = options.store;
    this.getWorkspaceRegistry = typeof options.getWorkspaceRegistry === 'function'
      ? options.getWorkspaceRegistry
      : () => undefined;
    this.getQq = typeof options.getQq === 'function' ? options.getQq : () => undefined;
    this.getSessionHeader = typeof options.getSessionHeader === 'function'
      ? options.getSessionHeader
      : () => undefined;
    this.getMemory = typeof options.getMemory === 'function' ? options.getMemory : () => undefined;
    this.getAgent = typeof options.getAgent === 'function' ? options.getAgent : () => undefined;
    this.assemblePrompt = typeof options.assemblePrompt === 'function'
      ? options.assemblePrompt : undefined;
    /** @type {Map<string, Record<string, any>>} */
    this.recent = new Map();
  }

  /** @returns {Record<string, any>} validated current state. */
  #state() {
    return this.store.requireState();
  }

  /** @returns {Record<string, any>|undefined} registry when it exposes the public contract. */
  #registry() {
    try {
      const registry = this.getWorkspaceRegistry();
      if (!registry || typeof registry.list !== 'function' || typeof registry.get !== 'function') return undefined;
      return registry;
    } catch {
      return undefined;
    }
  }

  /** @returns {Record<string, any>[]} current Workspace order. */
  #workspaces() {
    const registry = this.#registry();
    if (!registry) return [];
    try {
      const list = registry.list();
      return Array.isArray(list) ? list.filter(isPlainObject) : [];
    } catch {
      return [];
    }
  }

  /**
   * @param {string|null|undefined} id Workspace id.
   * @returns {Record<string, any>|undefined} Workspace entity.
   */
  #workspace(id) {
    if (typeof id !== 'string' || id.length === 0) return undefined;
    const registry = this.#registry();
    if (!registry) return undefined;
    try {
      const workspace = registry.get(id);
      return isPlainObject(workspace) ? workspace : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * @param {Record<string, any>} workspace Workspace entity.
   * @returns {string[]} authoritative session membership.
   */
  #sessionIds(workspace) {
    try {
      const ids = workspace?.sessionIds;
      return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  /**
   * @param {string} sessionId session id.
   * @returns {Record<string, any>|undefined} live header when the Host exposes one.
   */
  #header(sessionId) {
    try {
      const header = this.getSessionHeader(sessionId);
      return isPlainObject(header) ? header : undefined;
    } catch {
      return undefined;
    }
  }

  /** @returns {Record<string, any>|undefined} QQ Host service when the scene contract exists. */
  #qq() {
    try {
      const qq = this.getQq();
      if (!qq || typeof qq.resolveTrustedSessionScene !== 'function') return undefined;
      return qq;
    } catch {
      return undefined;
    }
  }

  /** Current authorization is read from QQ on every use; no cached allowlist. */
  #authorizedQqScenes(workspaceId) {
    const qq = this.#qq();
    if (!qq || typeof qq.listAuthorizedScenes !== 'function') return null;
    try {
      const entries = qq.listAuthorizedScenes();
      if (!Array.isArray(entries)) return [];
      return entries.slice(0, MAX_DISCOVERED_SCENES).map(entry =>
        normalizeAuthorizedQqScene(entry, workspaceId)).filter(Boolean);
    } catch {
      return [];
    }
  }

  #isAuthorizedQqScene(scene, workspaceId) {
    const scenes = this.#authorizedQqScenes(workspaceId);
    return scenes === null || scenes.some(candidate => qqSceneKey(candidate) === qqSceneKey(scene));
  }

  /** Memory has no public effective-persona read contract in the checked version. */
  #warnings() {
    const warnings = this.store.warnings();
    try {
      if (this.getMemory()) warnings.push('PERSONA_MEMORY_CARD_STATUS_UNVERIFIED');
    } catch {
      // Optional plugin discovery must not block Persona.
    }
    return warnings;
  }

  /**
   * Resolve one Session against the QQ Host contract.
   * @param {string} sessionId Session id.
   * @returns {{status: 'verified', scene: {kind: 'group'|'private', botId: string, peerId: string}}|{status: 'invalid'|'unavailable'}} mapping state.
   */
  #resolveQqSession(sessionId) {
    const qq = this.#qq();
    if (!qq) return { status: 'unavailable' };
    let raw;
    try {
      raw = qq.resolveTrustedSessionScene(sessionId);
    } catch {
      return { status: 'invalid' };
    }
    const scene = normalizeTrustedQqScene(raw);
    return scene === null ? { status: 'invalid' } : { status: 'verified', scene };
  }

  /**
   * @param {Record<string, any>} state state.
   * @returns {Record<string, any>|undefined} bound Workspace.
   */
  #boundWorkspace(state) {
    return this.#workspace(state.workspaceId);
  }

  /**
   * @param {Record<string, any>} state state.
   * @returns {Record<string, any>} bound Workspace or a stable error.
   */
  #requireBoundWorkspace(state) {
    if (state.workspaceId === null) {
      throw new PersonaValidationError('bind a DSH Workspace before creating a binding');
    }
    if (!this.#registry()) {
      throw new PersonaUnavailableError('PERSONA_WORKSPACE_UNAVAILABLE', 'DSH Workspace registry is unavailable');
    }
    const workspace = this.#boundWorkspace(state);
    if (!workspace) throw new PersonaValidationError('the bound DSH Workspace no longer exists');
    if (state.bindingWorkspaceId !== state.workspaceId) {
      throw new PersonaValidationError('bindings belong to a different DSH Workspace');
    }
    return workspace;
  }

  /**
   * @param {Record<string, any>} workspace Workspace.
   * @param {string} sessionId Session id.
   * @returns {void}
   */
  #requireWorkspaceMember(workspace, sessionId) {
    if (!this.#sessionIds(workspace).includes(sessionId)) {
      throw new PersonaValidationError('Session is not a current member of the bound Workspace');
    }
  }

  /**
   * @param {unknown} scene raw input Scene.
   * @returns {{kind: 'group'|'private', botId: string, peerId: string}} validated Scene.
   */
  #inputScene(scene) {
    const raw = requireObject(scene, 'scene');
    requireExactKeys(raw, ['kind', 'botId', 'peerId'], [], 'scene');
    if (raw.kind !== 'group' && raw.kind !== 'private') {
      throw new PersonaValidationError('QQ Scene kind must be group or private');
    }
    if (typeof raw.botId !== 'string' || typeof raw.peerId !== 'string') {
      throw new PersonaValidationError('QQ Scene botId and peerId must be strings');
    }
    const normalized = { kind: raw.kind, botId: raw.botId, peerId: raw.peerId };
    try {
      qqSceneKey(normalized);
    } catch {
      throw new PersonaValidationError('QQ Scene identity is invalid');
    }
    return normalized;
  }

  /**
   * Validate one binding target against current Workspace membership and QQ
   * Host mapping.
   * @param {Record<string, any>} state current entity data.
   * @param {{kind: unknown, sessionId?: unknown, scene?: unknown}} input target.
   * @returns {{key: string, kind: 'session'|'qq', sessionId?: string, scene?: Record<string, string>}} target.
   */
  #bindingTarget(state, input) {
    const workspace = this.#requireBoundWorkspace(state);
    if (input.kind === 'session') {
      if (input.scene !== undefined) {
        throw new PersonaValidationError('a Session binding must not name a QQ Scene');
      }
      const sessionId = requireIdentity(input.sessionId, 'Session id');
      this.#requireWorkspaceMember(workspace, sessionId);
      const header = this.#header(sessionId);
      if (header?.origin === 'subagent') {
        throw new PersonaValidationError('subagent Sessions are excluded and cannot be bound');
      }
      const qqMapping = this.#resolveQqSession(sessionId);
      if (qqMapping.status === 'verified' || isKnownQqPreset(header)) {
        throw new PersonaValidationError('QQ Sessions must use a verified QQ Scene binding');
      }
      return { key: sessionBindingKey(sessionId), kind: 'session', sessionId };
    }
    if (input.kind === 'qq') {
      let scene;
      if (input.sessionId !== undefined) {
        const sessionId = requireIdentity(input.sessionId, 'Session id');
        this.#requireWorkspaceMember(workspace, sessionId);
        const mapping = this.#resolveQqSession(sessionId);
        if (mapping.status === 'unavailable') {
          throw new PersonaUnavailableError('PERSONA_QQ_UNAVAILABLE', 'QQ Scene mapping is unavailable');
        }
        if (mapping.status !== 'verified') {
          throw new PersonaValidationError('QQ Session has no verified Scene mapping');
        }
        scene = mapping.scene;
        if (!this.#isAuthorizedQqScene(scene, state.workspaceId)) {
          throw new PersonaValidationError('QQ Scene is no longer authorized for this Workspace');
        }
        if (input.scene !== undefined) {
          const candidate = this.#inputScene(input.scene);
          if (qqSceneKey(candidate) !== qqSceneKey(scene)) {
            throw new PersonaValidationError('QQ Scene does not match the Session mapping');
          }
          scene = candidate;
        }
      } else {
        if (input.scene === undefined) {
          throw new PersonaValidationError('a QQ binding requires a trusted Session id or Scene');
        }
        const candidate = this.#inputScene(input.scene);
        const qq = this.#qq();
        if (!qq) throw new PersonaUnavailableError('PERSONA_QQ_UNAVAILABLE', 'QQ Scene mapping is unavailable');
        const authorized = this.#authorizedQqScenes(state.workspaceId);
        if (authorized !== null) {
          scene = authorized.find(item => qqSceneKey(item) === qqSceneKey(candidate));
          if (!scene) throw new PersonaValidationError('QQ Scene is not authorized for this Workspace');
          return { key: qqSceneKey(scene), kind: 'qq', scene };
        }
        let found = false;
        let invalid = false;
        for (const sessionId of this.#sessionIds(workspace)) {
          const mapping = this.#resolveQqSession(sessionId);
          if (mapping.status === 'verified' && qqSceneKey(mapping.scene) === qqSceneKey(candidate)) {
            found = true;
            scene = mapping.scene;
            break;
          }
          if (mapping.status === 'invalid') invalid = true;
        }
        if (!found) {
          throw new PersonaValidationError(invalid
            ? 'QQ Scene mapping is not trusted for this Workspace'
            : 'QQ Scene is not mapped to a current Workspace Session');
        }
      }
      return { key: qqSceneKey(scene), kind: 'qq', scene };
    }
    throw new PersonaValidationError('binding kind must be session or qq');
  }

  /**
   * Validate mode plus style reference against the given styles.
   * @param {Record<string, any>} state state.
   * @param {unknown} mode mode.
   * @param {unknown} styleId style id.
   * @returns {{mode: string, styleId: string|null}} normalized.
   */
  #bindingMode(state, mode, styleId) {
    try {
      return validateBindingMode(mode, styleId, state.styles);
    } catch (error) {
      if (error instanceof PersonaError) throw error;
      throw new PersonaValidationError('binding mode is invalid');
    }
  }

  /**
   * @param {Record<string, any>} binding stored binding.
   * @param {Record<string, any>} state current state.
   * @returns {{valid: boolean, reason: string}} status.
   */
  #bindingStatus(binding, state) {
    if (!Object.hasOwn(state.styles, binding.styleId ?? '')) {
      if (binding.mode === 'style') return { valid: false, reason: 'style_missing' };
    }
    if (state.workspaceId === null) return { valid: false, reason: 'workspace_unbound' };
    if (state.bindingWorkspaceId !== state.workspaceId) return { valid: false, reason: 'binding_workspace_mismatch' };
    const workspace = this.#boundWorkspace(state);
    if (!workspace) return { valid: false, reason: 'workspace_missing' };
    const members = this.#sessionIds(workspace);
    if (binding.kind === 'session') {
      return members.includes(binding.sessionId)
        ? { valid: true, reason: 'workspace_member' }
        : { valid: false, reason: 'not_workspace_member' };
    }
    const qq = this.#qq();
    if (!qq) return { valid: false, reason: 'qq_unavailable' };
    const authorized = this.#authorizedQqScenes(state.workspaceId);
    if (authorized !== null && !authorized.some(scene => qqSceneKey(scene) === binding.key)) {
      return { valid: false, reason: 'qq_revoked' };
    }
    let invalid = false;
    for (const sessionId of members) {
      const mapping = this.#resolveQqSession(sessionId);
      if (mapping.status === 'verified' && qqSceneKey(mapping.scene) === binding.key) {
        return { valid: true, reason: 'verified_qq_scene' };
      }
      if (mapping.status === 'invalid') invalid = true;
    }
    if (authorized !== null) return { valid: true, reason: 'awaiting_first_session' };
    return { valid: false, reason: invalid ? 'qq_mapping_invalid' : 'qq_scene_unmapped' };
  }

  /**
   * @param {Record<string, any>} binding stored binding.
   * @param {Record<string, any>} state state.
   * @returns {Record<string, any>} owner view.
   */
  #bindingView(binding, state) {
    const status = this.#bindingStatus(binding, state);
    return {
      key: binding.key,
      kind: binding.kind,
      mode: binding.mode,
      styleId: binding.styleId,
      styleName: binding.styleId === null ? null : state.styles[binding.styleId]?.name ?? null,
      ...(binding.sessionId === undefined ? {} : { sessionId: binding.sessionId }),
      ...(binding.scene === undefined ? {} : { scene: structuredClone(binding.scene) }),
      revision: binding.revision,
      createdAt: binding.createdAt,
      updatedAt: binding.updatedAt,
      status,
    };
  }

  /**
   * Remember the most recent assemblies without retaining prompt text.
   * @param {Record<string, any>} observation observation.
   */
  #recordObservation(observation) {
    const key = typeof observation.sessionId === 'string' && observation.sessionId.length > 0
      ? observation.sessionId
      : 'unknown';
    this.recent.delete(key);
    this.recent.set(key, observation);
    while (this.recent.size > MAX_RECENT_ASSEMBLIES) {
      const oldest = this.recent.keys().next().value;
      if (oldest === undefined) break;
      this.recent.delete(oldest);
    }
  }

  /**
   * Resolve the effective persona for one prompt assembly.
   *
   * This method never throws: any trust or storage failure yields empty text
   * and a stable diagnostic reason.  Both System Prompt section callbacks call
   * it (through one per-assembly cache owned by the plugin entry).
   * @param {Record<string, any>} agent live Agent from the assembly context.
   * @returns {Record<string, any>} resolution, including `coreText`/`styleText`.
   */
  resolveForAssembly(agent) {
    const session = objectOrNull(agent?.session);
    const header = objectOrNull(session?.header);
    const sessionId = typeof agent?.id === 'string'
      ? agent.id
      : typeof session?.id === 'string'
        ? session.id
        : typeof header?.id === 'string' ? header.id : null;
    const at = safeNow(this.store);
    /** @type {Record<string, any>} */
    const observation = {
      at,
      sessionId,
      agentPreset: typeof header?.agentPreset === 'string' ? header.agentPreset : null,
      workspaceId: null,
      qqState: 'not_checked',
      source: 'none',
      bindingKey: null,
      mode: 'none',
      styleId: null,
      coreInjected: false,
      styleInjected: false,
      coreCallback: false,
      sceneCallback: false,
      reason: 'ok',
      revision: null,
    };
    /** @type {Record<string, any>} */
    const resolution = {
      at,
      sessionId,
      coreText: '',
      styleText: '',
      coreInjected: false,
      styleInjected: false,
      reason: 'ok',
      mode: 'none',
      source: 'none',
      bindingKey: null,
      styleId: null,
      styleName: null,
      workspaceId: null,
      revision: null,
      qqState: 'not_checked',
      coreCallback: false,
      sceneCallback: false,
    };
    this.#recordObservation(observation);

    /**
     * @param {string} reason failure reason.
     * @param {Record<string, any>} [extra] safe observation fields.
     * @returns {Record<string, any>} empty resolution.
     */
    const empty = (reason, extra = {}) => {
      Object.assign(observation, { reason, ...extra });
      Object.assign(resolution, {
        reason,
        coreText: '',
        styleText: '',
        coreInjected: false,
        styleInjected: false,
        ...(extra.workspaceId === undefined ? {} : { workspaceId: extra.workspaceId }),
        ...(extra.revision === undefined ? {} : { revision: extra.revision }),
        ...(extra.qqState === undefined ? {} : { qqState: extra.qqState }),
        ...(extra.source === undefined ? {} : { source: extra.source }),
        ...(extra.bindingKey === undefined ? {} : { bindingKey: extra.bindingKey }),
        ...(extra.mode === undefined ? {} : { mode: extra.mode }),
        ...(extra.styleId === undefined ? {} : { styleId: extra.styleId }),
      });
      return resolution;
    };

    if (sessionId === null || header === null) return empty('no_session');
    if (header.origin === 'subagent') return empty('subagent');

    let state;
    try {
      state = this.#state();
    } catch {
      return empty('storage_unavailable');
    }
    observation.revision = state.revision;
    resolution.revision = state.revision;
    if (state.injectionEnabled !== true) return empty('injection_disabled', { revision: state.revision });
    if (state.workspaceId === null) return empty('workspace_unbound', { revision: state.revision });
    if (state.bindingWorkspaceId !== state.workspaceId) return empty('binding_workspace_mismatch', { revision: state.revision });

    const workspace = this.#boundWorkspace(state);
    if (!workspace) return empty('workspace_missing', { workspaceId: state.workspaceId, revision: state.revision });
    observation.workspaceId = state.workspaceId;
    resolution.workspaceId = state.workspaceId;
    if (!this.#sessionIds(workspace).includes(sessionId)) {
      return empty('not_workspace_member', { workspaceId: state.workspaceId, revision: state.revision });
    }
    let sessionKey;
    try {
      sessionKey = sessionBindingKey(sessionId);
    } catch {
      return empty('session_invalid', { workspaceId: state.workspaceId, revision: state.revision });
    }

    const qqMapping = this.#resolveQqSession(sessionId);
    observation.qqState = qqMapping.status;
    resolution.qqState = qqMapping.status;
    if (isKnownQqPreset(header) && qqMapping.status !== 'verified') {
      return empty('qq_mapping_untrusted', {
        workspaceId: state.workspaceId,
        revision: state.revision,
        qqState: qqMapping.status,
      });
    }

    /** @type {Record<string, any>|undefined} */
    let binding;
    if (qqMapping.status === 'verified') {
      if (!this.#isAuthorizedQqScene(qqMapping.scene, state.workspaceId)) {
        return empty('qq_scene_revoked', { workspaceId: state.workspaceId, revision: state.revision, qqState: qqMapping.status });
      }
      const key = qqSceneKey(qqMapping.scene);
      if (Object.hasOwn(state.bindings, key)) {
        binding = state.bindings[key];
        observation.source = 'qq-binding';
      }
    }
    if (binding === undefined && qqMapping.status !== 'verified') {
      if (Object.hasOwn(state.bindings, sessionKey)) {
        binding = state.bindings[sessionKey];
        observation.source = 'session-binding';
      }
    }

    if (binding !== undefined) {
      observation.bindingKey = binding.key;
      observation.mode = binding.mode;
      resolution.bindingKey = binding.key;
      resolution.mode = binding.mode;
      resolution.source = observation.source;
      if (binding.mode === 'disabled') {
        return empty('binding_disabled', {
          workspaceId: state.workspaceId,
          revision: state.revision,
          source: observation.source,
          bindingKey: binding.key,
          mode: binding.mode,
          qqState: qqMapping.status,
        });
      }
    } else {
      observation.source = 'workspace-default';
      resolution.source = 'workspace-default';
    }

    const coreText = state.core.body;
    if (coreText.trim().length === 0) {
      return empty('core_empty', {
        workspaceId: state.workspaceId,
        revision: state.revision,
        source: observation.source,
        bindingKey: binding?.key ?? null,
        mode: binding?.mode ?? 'inherit',
        qqState: qqMapping.status,
      });
    }

    let styleId = null;
    let mode = 'core-only';
    if (binding === undefined || binding.mode === 'inherit') {
      styleId = state.defaultStyleId;
      mode = styleId === null ? 'core-only' : 'style';
    } else if (binding.mode === 'style') {
      styleId = binding.styleId;
      mode = 'style';
    } else {
      mode = binding.mode;
    }

    let styleText = '';
    let styleName = null;
    let reason = 'ok';
    if (styleId !== null) {
      const style = state.styles[styleId];
      if (style === undefined) {
        styleId = null;
        mode = 'core-only';
        reason = 'style_missing';
      } else {
        styleText = style.body;
        styleName = style.name;
      }
    }

    Object.assign(observation, {
      reason,
      source: resolution.source,
      bindingKey: binding?.key ?? null,
      mode,
      styleId,
      coreInjected: coreText.length > 0,
      styleInjected: styleText.length > 0,
    });
    Object.assign(resolution, {
      reason,
      coreText,
      styleText,
      coreInjected: coreText.length > 0,
      styleInjected: styleText.length > 0,
      mode,
      styleId,
      styleName,
    });
    return resolution;
  }

  /**
   * Mark that one registered section callback actually ran for this assembly.
   * @param {Record<string, any>} resolution resolution returned by resolveForAssembly.
   * @param {'core'|'scene'} part section part.
   */
  markSectionInvoked(resolution, part) {
    if (!isPlainObject(resolution)) return;
    if (part === 'core') resolution.coreCallback = true;
    else if (part === 'scene') resolution.sceneCallback = true;
    for (const observation of this.recent.values()) {
      if (observation.sessionId === resolution.sessionId
        && observation.revision === resolution.revision
        && observation.at === resolution.at) {
        if (part === 'core') observation.coreCallback = true;
        else if (part === 'scene') observation.sceneCallback = true;
      }
    }
  }

  /** @returns {Record<string, any>} owner overview. */
  overview() {
    const state = this.#state();
    const workspace = this.#boundWorkspace(state);
    const sessions = workspace === undefined ? [] : this.#sessionIds(workspace);
    return {
      revision: state.revision,
      schemaVersion: state.schemaVersion,
      injectionEnabled: state.injectionEnabled,
      workspace: workspace === undefined
        ? null
        : { id: workspace.id, title: safeTitle(workspace), sessionCount: sessions.length },
      workspaceId: state.workspaceId,
      defaultStyleId: state.defaultStyleId,
      defaultStyleName: state.defaultStyleId === null ? null : state.styles[state.defaultStyleId]?.name ?? null,
      counts: {
        styles: Object.keys(state.styles).length,
        bindings: Object.keys(state.bindings).length,
        history: state.history.length,
      },
      storage: this.store.health(),
      warnings: this.#warnings(),
      versionImpact: 'next_model_assembly',
      sessionRecreation: false,
      limits: publicLimits(),
    };
  }

  /** @returns {Record<string, any>} workspace list, live session hints and trusted QQ Scenes. */
  listWorkspaces() {
    const state = this.#state();
    const workspaces = this.#workspaces().map((workspace) => {
      const ids = this.#sessionIds(workspace);
      return {
        id: workspace.id,
        title: safeTitle(workspace),
        sessionCount: ids.length,
        sessions: ids.map((sessionId) => {
          const header = this.#header(sessionId);
          return {
            id: sessionId,
            agentPreset: typeof header?.agentPreset === 'string' ? header.agentPreset : null,
            subagent: header?.origin === 'subagent',
          };
        }),
      };
    });
    const bound = this.#boundWorkspace(state);
    const scenes = [];
    let qqAvailable = this.#qq() !== undefined;
    if (bound !== undefined) {
      const seen = new Set();
      const authorized = this.#authorizedQqScenes(state.workspaceId);
      if (authorized !== null) {
        for (const scene of authorized) {
          const key = qqSceneKey(scene);
          if (seen.has(key)) continue;
          seen.add(key);
          scenes.push({ key, ...scene, sessionId: null, status: 'awaiting_first_session' });
        }
      }
      for (const sessionId of this.#sessionIds(bound)) {
        if (scenes.length >= MAX_DISCOVERED_SCENES) break;
        const mapping = this.#resolveQqSession(sessionId);
        if (mapping.status !== 'verified') continue;
        const key = qqSceneKey(mapping.scene);
        if (authorized !== null && !this.#isAuthorizedQqScene(mapping.scene, state.workspaceId)) continue;
        if (seen.has(key)) {
          const existing = scenes.find(item => item.key === key);
          if (existing) { existing.sessionId = sessionId; existing.status = 'session_linked'; }
          continue;
        }
        seen.add(key);
        scenes.push({ key, ...mapping.scene, sessionId, status: 'session_linked' });
      }
    }
    return {
      revision: state.revision,
      boundWorkspaceId: state.workspaceId,
      workspaces,
      qq: { available: qqAvailable, scenes },
    };
  }

  /** @returns {Record<string, any>} card library with token metadata and hard limits. */
  getCards() {
    const state = this.#state();
    return {
      revision: state.revision,
      core: coreView(state.core),
      styles: Object.values(state.styles).map(styleView),
      defaultStyleId: state.defaultStyleId,
      injectionEnabled: state.injectionEnabled,
      limits: publicLimits(),
      warnings: this.#warnings(),
    };
  }

  /** @returns {Record<string, any>} bindings with current trust status. */
  getBindings() {
    const state = this.#state();
    return {
      revision: state.revision,
      workspaceId: state.workspaceId,
      bindings: Object.values(state.bindings).map(binding => this.#bindingView(binding, state)),
    };
  }

  /**
   * @param {'core'|'style'} cardType card type.
   * @param {string|null} cardId style id for styles.
   * @returns {Record<string, any>} bounded prior versions.
   */
  getHistory(cardType, cardId) {
    if (cardType !== 'core' && cardType !== 'style') {
      throw new PersonaValidationError('cardType must be core or style');
    }
    const id = cardType === 'style' ? validateStyleId(cardId, 'style id') : null;
    const state = this.#state();
    return {
      revision: state.revision,
      cardType,
      cardId: id,
      history: this.store.historyForCard(cardType, id),
    };
  }

  /** @returns {Promise<Record<string, any>>} valid backups and invalid count. */
  async getBackups() {
    return await this.store.listBackups();
  }

  /** @returns {Record<string, any>} sanitized live status. */
  diagnostics() {
    /** @type {Record<string, any>} */
    const base = {
      generatedAt: safeNow(this.store),
      sections: {
        hostGlobal: true,
        configured: [
          { name: 'amadeus:core-persona', order: 10, interpolate: false, complete: false, registered: true },
          { name: 'amadeus:scene-persona', order: 10190, interpolate: false, complete: false, registered: true },
        ],
        assembled: [...this.recent.values()].reverse().map(observation => ({
          at: observation.at,
          sessionId: observation.sessionId,
          agentPreset: observation.agentPreset,
          workspaceId: observation.workspaceId,
          qqState: observation.qqState,
          source: observation.source,
          bindingKey: observation.bindingKey,
          mode: observation.mode,
          styleId: observation.styleId,
          coreInjected: observation.coreInjected,
          styleInjected: observation.styleInjected,
          coreCallback: observation.coreCallback,
          sceneCallback: observation.sceneCallback,
          reason: observation.reason,
          revision: observation.revision,
        })),
        overridden: 'unverified',
        finalVisibility: 'unverified',
        note: 'DSH restores a registered complete section after the assembly waterfall, so final prompt visibility cannot be proven from the section callback alone. Persona registers no complete section; the final Section list is unverified unless a trusted Host check reports it.',
      },
      capabilities: {
        registersTools: false,
        modifiesTools: false,
        selectsPreset: false,
        modifiesRuntimeContext: false,
        readsMemory: false,
        readsLife: false,
        readsState: false,
        changesQqPermissions: false,
      },
      versionImpact: 'next_model_assembly',
      sessionRecreation: false,
      limitations: [
        'final prompt visibility is unverified when another preset supplies a complete system prompt section',
        'QQ prebinding requires a current authorized Scene in the bound Workspace; active injection also requires a trusted Session mapping',
        'token counts are heuristic estimates, not tokenizer-exact',
      ],
    };
    let state;
    try {
      state = this.#state();
    } catch (error) {
      return {
        ...base,
        storage: this.store.health(),
        error: error instanceof PersonaError ? error.code : 'PERSONA_STORAGE_UNAVAILABLE',
        workspace: null,
        counts: null,
        bindings: [],
        warnings: [],
      };
    }
    const workspace = this.#boundWorkspace(state);
    return {
      ...base,
      storage: this.store.health(),
      revision: state.revision,
      injectionEnabled: state.injectionEnabled,
      workspace: workspace === undefined
        ? null
        : { id: workspace.id, title: safeTitle(workspace), sessionCount: this.#sessionIds(workspace).length },
      counts: {
        styles: Object.keys(state.styles).length,
        bindings: Object.keys(state.bindings).length,
        history: state.history.length,
      },
      defaultStyleId: state.defaultStyleId,
      bindings: Object.values(state.bindings).map(binding => this.#bindingView(binding, state)),
      warnings: this.#warnings(),
    };
  }

  /**
   * Assemble one live, Workspace-authorized Agent through the real Host and
   * inspect only the final section list. Never return prompt text or tools.
   * A read-only probe is explicit because assembly may invoke other plugins'
   * dynamic providers; it is not run on every diagnostics page load.
   * @param {string} sessionId trusted Session id selected by the Owner.
   * @returns {Promise<Record<string, any>>} final visibility evidence.
   */
  async probeFinalVisibility(sessionId) {
    const id = requireIdentity(sessionId, 'sessionId');
    const state = this.#state();
    const workspace = this.#requireBoundWorkspace(state);
    this.#requireWorkspaceMember(workspace, id);
    if (typeof this.assemblePrompt !== 'function') {
      return { status: 'unavailable', reason: 'host_assembly_unavailable' };
    }
    let agent;
    try { agent = this.getAgent(id); } catch { agent = undefined; }
    if (!agent || typeof agent !== 'object' || agent.id !== id) {
      return { status: 'unavailable', reason: 'agent_not_live' };
    }
    const expected = this.resolveForAssembly(agent);
    if (expected.reason !== 'ok' && expected.reason !== 'style_missing') {
      return { status: 'unavailable', reason: expected.reason };
    }
    let assembly;
    try {
      assembly = await this.assemblePrompt(agent);
    } catch {
      return { status: 'unavailable', reason: 'host_assembly_failed' };
    }
    if (!Array.isArray(assembly?.sections)) {
      return { status: 'unavailable', reason: 'invalid_host_assembly' };
    }
    if (this.#state().revision !== state.revision) {
      return { status: 'unavailable', reason: 'state_changed_during_check' };
    }
    const core = assembly.sections.find(section => section?.name === 'amadeus:core-persona');
    const scene = assembly.sections.find(section => section?.name === 'amadeus:scene-persona');
    const coreVisible = core?.text === formatPersonaSection('core', expected.coreText) && expected.coreText.length > 0;
    const sceneExpected = expected.styleText.length > 0;
    const sceneVisible = sceneExpected && scene?.text === formatPersonaSection('scene', expected.styleText);
    return {
      status: coreVisible && (!sceneExpected || sceneVisible) ? 'visible' : 'overridden',
      reason: coreVisible && (!sceneExpected || sceneVisible) ? 'final_sections_match' : 'final_sections_missing_or_changed',
      sessionId: id,
      revision: state.revision,
      checkedAt: safeNow(this.store),
      coreVisible,
      sceneExpected,
      sceneVisible,
      finalSectionCount: assembly.sections.length,
    };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {string|null} workspaceId Workspace id or null.
   * @returns {Promise<Record<string, any>>} updated overview.
   */
  async bindWorkspace(expectedRevision, workspaceId) {
    const id = workspaceId === null ? null : requireIdentity(workspaceId, 'workspaceId');
    if (id !== null && !this.#workspace(id)) {
      throw new PersonaValidationError('DSH Workspace was not found');
    }
    const result = await this.store.mutate(expectedRevision, {
      action: 'workspace.bind',
      changes: { kind: 'workspace' },
      backupOnWorkspaceChange: true,
    }, (draft) => {
      if (id !== null && !this.#workspace(id)) {
        throw new PersonaValidationError('DSH Workspace was not found');
      }
      const archivedBindingCount = draft.workspaceId === id ? 0 : Object.keys(draft.bindings).length;
      if (draft.workspaceId !== id) draft.bindings = {};
      draft.workspaceId = id;
      draft.bindingWorkspaceId = id;
      return { workspaceId: id, archivedBindingCount };
    });
    return {
      revision: result.state.revision,
      workspaceId: result.result.workspaceId,
      archivedBindingCount: result.result.archivedBindingCount,
      backupId: result.backup?.id ?? null,
      workspace: result.result.workspaceId === null
        ? null
        : { id: result.result.workspaceId, title: safeTitle(this.#workspace(result.result.workspaceId)) },
      versionImpact: 'next_model_assembly',
    };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {boolean} injectionEnabled global switch.
   * @returns {Promise<Record<string, any>>} new state metadata.
   */
  async setInjectionEnabled(expectedRevision, injectionEnabled) {
    if (typeof injectionEnabled !== 'boolean') {
      throw new PersonaValidationError('injectionEnabled must be a boolean');
    }
    const result = await this.store.mutate(expectedRevision, {
      action: 'settings.update',
      changes: { kind: 'settings' },
    }, (draft) => {
      draft.injectionEnabled = injectionEnabled;
      return { injectionEnabled };
    });
    return { revision: result.state.revision, injectionEnabled: result.result.injectionEnabled };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {unknown} body new core body.
   * @returns {Promise<Record<string, any>>} new core view.
   */
  async updateCore(expectedRevision, body) {
    const normalized = validateCoreBody(body);
    const result = await this.store.mutate(expectedRevision, {
      action: 'core.update',
      changes: { kind: 'core' },
    }, (draft) => {
      const now = this.store.nowIso();
      draft.core = {
        body: normalized,
        revision: draft.core.revision + 1,
        createdAt: draft.core.createdAt,
        updatedAt: now,
      };
      return { core: coreView(draft.core) };
    });
    return { revision: result.state.revision, core: result.result.core };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {{name: unknown, description?: unknown, body: unknown, color?: unknown}} input new style.
   * @returns {Promise<Record<string, any>>} new style view.
   */
  async createStyle(expectedRevision, input) {
    const name = validateStyleName(input?.name);
    const description = validateStyleDescription(input?.description);
    const body = validateStyleBody(input?.body);
    const color = validateStyleColor(input?.color);
    const id = `style-${randomUUID()}`;
    const result = await this.store.mutate(expectedRevision, {
      action: 'style.create',
      changes: { kind: 'style', id },
    }, (draft) => {
      const now = this.store.nowIso();
      draft.styles[id] = makeStyle({ id, name, description, body, color, now });
      return { style: styleView(draft.styles[id]) };
    });
    return { revision: result.state.revision, style: result.result.style };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {string} styleId style id.
   * @param {{name?: unknown, description?: unknown, body?: unknown, color?: unknown}} patch fields.
   * @returns {Promise<Record<string, any>>} updated style view.
   */
  async updateStyle(expectedRevision, styleId, patch) {
    const id = validateStyleId(styleId);
    if (!isPlainObject(patch)) throw new PersonaValidationError('style update must be an object');
    const provided = ['name', 'description', 'body', 'color'].filter(key => Object.hasOwn(patch, key));
    if (provided.length === 0) throw new PersonaValidationError('style update requires at least one field');
    const normalized = {};
    if (Object.hasOwn(patch, 'name')) normalized.name = validateStyleName(patch.name);
    if (Object.hasOwn(patch, 'description')) normalized.description = validateStyleDescription(patch.description);
    if (Object.hasOwn(patch, 'body')) normalized.body = validateStyleBody(patch.body);
    if (Object.hasOwn(patch, 'color')) normalized.color = validateStyleColor(patch.color);
    const result = await this.store.mutate(expectedRevision, {
      action: 'style.update',
      changes: { kind: 'style', id },
    }, (draft) => {
      const current = draft.styles[id];
      if (current === undefined) throw new PersonaNotFoundError('style was not found');
      draft.styles[id] = {
        ...current,
        ...normalized,
        revision: current.revision + 1,
        updatedAt: this.store.nowIso(),
      };
      return { style: styleView(draft.styles[id]) };
    });
    return { revision: result.state.revision, style: result.result.style };
  }

  /**
   * Delete one style and fall affected bindings back to the Workspace default.
   * @param {number} expectedRevision optimistic lock.
   * @param {string} styleId style id.
   * @returns {Promise<Record<string, any>>} deletion summary.
   */
  async deleteStyle(expectedRevision, styleId) {
    const id = validateStyleId(styleId);
    const result = await this.store.mutate(expectedRevision, {
      action: 'style.delete',
      changes: { kind: 'style', id },
    }, (draft) => {
      if (!Object.hasOwn(draft.styles, id)) throw new PersonaNotFoundError('style was not found');
      delete draft.styles[id];
      const now = this.store.nowIso();
      let defaultStyleReset = false;
      if (draft.defaultStyleId === id) {
        draft.defaultStyleId = null;
        defaultStyleReset = true;
      }
      const affectedBindings = [];
      for (const binding of Object.values(draft.bindings)) {
        if (binding.mode === 'style' && binding.styleId === id) {
          binding.mode = 'inherit';
          binding.styleId = null;
          binding.revision += 1;
          binding.updatedAt = now;
          affectedBindings.push(binding.key);
        }
      }
      return { affectedBindings, affectedCount: affectedBindings.length, defaultStyleReset };
    });
    return { revision: result.state.revision, ...result.result };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {string} styleId source style.
   * @param {{name?: unknown}} [input] optional copy name.
   * @returns {Promise<Record<string, any>>} copied style.
   */
  async copyStyle(expectedRevision, styleId, input = {}) {
    const sourceId = validateStyleId(styleId);
    const requestedName = isPlainObject(input) && input.name !== undefined
      ? validateStyleName(input.name)
      : null;
    const id = `style-${randomUUID()}`;
    const result = await this.store.mutate(expectedRevision, {
      action: 'style.create',
      changes: { kind: 'style', id },
    }, (draft) => {
      const source = draft.styles[sourceId];
      if (source === undefined) throw new PersonaNotFoundError('style was not found');
      const copyName = requestedName ?? truncateName(`${source.name} (copy)`);
      const now = this.store.nowIso();
      draft.styles[id] = makeStyle({
        id,
        name: copyName,
        description: source.description,
        body: source.body,
        color: source.color,
        now,
      });
      return { style: styleView(draft.styles[id]), sourceStyleId: sourceId };
    });
    return { revision: result.state.revision, style: result.result.style, sourceStyleId: result.result.sourceStyleId };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {string|null} styleId default style or null for core-only.
   * @returns {Promise<Record<string, any>>} new default.
   */
  async setDefaultStyle(expectedRevision, styleId) {
    const id = styleId === null ? null : validateStyleId(styleId);
    const result = await this.store.mutate(expectedRevision, {
      action: 'default-style.set',
      changes: { kind: 'default-style' },
    }, (draft) => {
      if (id !== null && !Object.hasOwn(draft.styles, id)) {
        throw new PersonaValidationError('default style does not exist');
      }
      draft.defaultStyleId = id;
      return { defaultStyleId: id };
    });
    return {
      revision: result.state.revision,
      defaultStyleId: result.result.defaultStyleId,
      defaultStyleName: result.result.defaultStyleId === null
        ? null
        : result.state.styles[result.result.defaultStyleId]?.name ?? null,
    };
  }

  /**
   * Create or update one binding after live trust validation.
   * @param {number} expectedRevision optimistic lock.
   * @param {{kind: 'session'|'qq', mode: string, styleId?: string|null, sessionId?: string, scene?: Record<string, string>}} input binding.
   * @returns {Promise<Record<string, any>>} binding view.
   */
  async upsertBinding(expectedRevision, input) {
    if (!isPlainObject(input)) throw new PersonaValidationError('binding must be an object');
    if (input.kind !== 'session' && input.kind !== 'qq') {
      throw new PersonaValidationError('binding kind must be session or qq');
    }
    if (!BINDING_MODES.includes(input.mode)) {
      throw new PersonaValidationError(`binding mode must be one of ${BINDING_MODES.join(', ')}`);
    }
    const preview = this.#bindingTarget(this.#state(), input);
    const result = await this.store.mutate(expectedRevision, {
      action: 'binding.upsert',
      changes: { kind: 'binding', id: preview.key },
    }, (draft) => {
      const mode = this.#bindingMode(draft, input.mode, input.styleId);
      const target = this.#bindingTarget(draft, input);
      if (target.key !== preview.key) {
        throw new PersonaValidationError('binding target changed; reload before retrying');
      }
      const now = this.store.nowIso();
      const existing = draft.bindings[target.key];
      const binding = {
        key: target.key,
        kind: target.kind,
        ...(target.sessionId === undefined ? {} : { sessionId: target.sessionId }),
        ...(target.scene === undefined ? {} : { scene: structuredClone(target.scene) }),
        mode: mode.mode,
        styleId: mode.styleId,
        revision: (existing?.revision ?? 0) + 1,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      draft.bindings[target.key] = binding;
      return { binding: this.#bindingView(binding, draft), key: target.key };
    });
    return { revision: result.state.revision, binding: result.result.binding };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {string} key binding key.
   * @returns {Promise<Record<string, any>>} deletion summary.
   */
  async deleteBinding(expectedRevision, key) {
    const bindingKey = requireIdentity(key, 'binding key');
    const result = await this.store.mutate(expectedRevision, {
      action: 'binding.delete',
      changes: { kind: 'binding', id: bindingKey },
    }, (draft) => {
      if (!Object.hasOwn(draft.bindings, bindingKey)) throw new PersonaNotFoundError('binding was not found');
      delete draft.bindings[bindingKey];
      return { key: bindingKey };
    });
    return { revision: result.state.revision, key: result.result.key };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {{cardType: 'core'|'style', cardId: string|null, historyId: string}} input rollback request.
   * @returns {Promise<Record<string, any>>} restored card view.
   */
  async rollback(expectedRevision, input) {
    if (!isPlainObject(input)) throw new PersonaValidationError('rollback must be an object');
    if (input.cardType !== 'core' && input.cardType !== 'style') {
      throw new PersonaValidationError('cardType must be core or style');
    }
    const cardId = input.cardType === 'style' ? validateStyleId(input.cardId, 'style id') : null;
    const historyId = requireIdentity(input.historyId, 'historyId');
    const result = await this.store.mutate(expectedRevision, {
      action: input.cardType === 'core' ? 'core.rollback' : 'style.rollback',
      changes: input.cardType === 'core'
        ? { kind: 'core' }
        : { kind: 'style', id: cardId },
    }, (draft) => {
      const entry = this.store.findHistory(historyId);
      const now = this.store.nowIso();
      if (input.cardType === 'core') {
        draft.core = {
          body: entry.data.core.body,
          revision: draft.core.revision + 1,
          createdAt: draft.core.createdAt,
          updatedAt: now,
        };
        return { core: coreView(draft.core) };
      }
      const current = draft.styles[cardId];
      if (current === undefined) throw new PersonaNotFoundError('style was not found');
      const snapshot = entry.data.styles[cardId];
      if (snapshot === undefined) throw new PersonaNotFoundError('style history was not found');
      draft.styles[cardId] = {
        ...current,
        name: snapshot.name,
        description: snapshot.description,
        body: snapshot.body,
        color: snapshot.color,
        revision: current.revision + 1,
        updatedAt: now,
      };
      return { style: styleView(draft.styles[cardId]) };
    });
    return {
      revision: result.state.revision,
      cardType: input.cardType,
      cardId,
      ...(result.result.core === undefined ? {} : { core: result.result.core }),
      ...(result.result.style === undefined ? {} : { style: result.result.style }),
    };
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {string} [reason] owner-facing reason.
   * @returns {Promise<Record<string, any>>} backup metadata.
   */
  async backup(expectedRevision, reason) {
    return await this.store.createBackup(reason, expectedRevision);
  }

  /**
   * @param {number} expectedRevision optimistic lock.
   * @param {string} backupId backup file id.
   * @param {unknown} confirm explicit destructive confirmation.
   * @returns {Promise<Record<string, any>>} restore metadata.
   */
  async restore(expectedRevision, backupId, confirm) {
    if (confirm !== 'RESTORE') throw new PersonaValidationError('explicit RESTORE confirmation is required');
    if (typeof backupId !== 'string') throw new PersonaValidationError('backupId is required');
    const result = await this.store.restore(backupId, expectedRevision);
    return { revision: result.state.revision, ...result.result };
  }
}

/**
 * @param {Record<string, any>} workspace Workspace entity.
 * @returns {string} safe title.
 */
function safeTitle(workspace) {
  if (!isPlainObject(workspace)) return 'Workspace';
  if (typeof workspace.title === 'string' && workspace.title.length > 0) return workspace.title;
  return 'Workspace';
}

/**
 * @param {string} value style name.
 * @returns {string} bounded copy name.
 */
function truncateName(value) {
  const characters = [...value];
  return characters.length > LIMITS.STYLE_NAME_MAX_CHARS
    ? characters.slice(0, LIMITS.STYLE_NAME_MAX_CHARS).join('')
    : value;
}

/**
 * Read a timestamp without ever throwing during prompt assembly.
 * @param {import('./store.js').PersonaStore} store store.
 * @returns {string} ISO timestamp.
 */
function safeNow(store) {
  try {
    return store.nowIso();
  } catch {
    return new Date(0).toISOString();
  }
}
