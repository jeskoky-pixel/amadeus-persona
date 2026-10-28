import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PersonaStore } from '../src/store.js';
import { PersonaService } from '../src/service.js';
import {
  makeStyle,
  qqSceneKey,
  sessionBindingKey,
} from '../src/validation.js';

/**
 * @returns {Promise<string>} unique temp directory.
 */
export async function makeTempDir() {
  return await mkdtemp(join(tmpdir(), 'amadeus-persona-test-'));
}

/**
 * @param {string} directory temp directory.
 * @returns {Promise<void>} removal.
 */
export async function removeTempDir(directory) {
  await rm(directory, { recursive: true, force: true });
}

/**
 * @param {{id: string, title?: string, sessionIds: string[]}[]} workspaces initial workspaces.
 * @returns {Record<string, any>} fake WorkspaceRegistry.
 */
export function makeRegistry(workspaces) {
  const map = new Map(workspaces.map(workspace => [workspace.id, {
    id: workspace.id,
    title: workspace.title ?? workspace.id,
    sessionIds: [...workspace.sessionIds],
  }]));
  return {
    list: () => [...map.values()],
    get: id => map.get(id),
    update(id, patch) {
      const workspace = map.get(id);
      if (workspace === undefined) throw new Error('workspace missing');
      Object.assign(workspace, patch);
    },
    removeSession(id, sessionId) {
      const workspace = map.get(id);
      if (workspace === undefined) throw new Error('workspace missing');
      workspace.sessionIds = workspace.sessionIds.filter(candidate => candidate !== sessionId);
    },
  };
}

/**
 * @param {Record<string, Record<string, any>>} mapping Session id to raw QQ Scene.
 * @param {{deny?: Set<string>}} [options] sessions that throw.
 * @returns {Record<string, any>} fake QQ Host service.
 */
export function makeQq(mapping, options = {}) {
  const deny = options.deny ?? new Set();
  const qq = {
    resolveTrustedSessionScene(sessionId) {
      if (deny.has(sessionId)) throw new Error('QQ session is not trusted');
      const scene = mapping[sessionId];
      if (scene === undefined || scene === null) throw new Error('QQ session is not trusted');
      return scene;
    },
  };
  if (options.authorized) qq.listAuthorizedScenes = () => options.authorized;
  return qq;
}

/**
 * @param {'group'|'private'} kind scene kind.
 * @param {string} botId bot identity.
 * @param {string} peerId peer identity.
 * @returns {Record<string, any>} raw verified QQ Scene.
 */
export function qqScene(kind, botId, peerId) {
  return {
    platform: 'qq',
    kind,
    id: `${botId}:${peerId}`,
    verified: true,
    admin: false,
  };
}

/**
 * @param {string} sessionId Session id.
 * @param {{origin?: 'subagent', parentSession?: string, agentPreset?: string}} [options] header fields.
 * @returns {Record<string, any>} fake Agent.
 */
export function makeAgent(sessionId, options = {}) {
  return {
    id: sessionId,
    session: {
      id: sessionId,
      header: {
        version: 1,
        id: sessionId,
        createdAt: 1,
        isSeeded: false,
        cwd: 'C:\\workspace',
        ...(options.origin === undefined ? {} : { origin: options.origin }),
        ...(options.parentSession === undefined ? {} : { parentSession: options.parentSession }),
        ...(options.agentPreset === undefined ? {} : { agentPreset: options.agentPreset }),
      },
    },
  };
}

/**
 * Build a service over a real store with fake Host peers.
 * @param {{store: PersonaStore, registry: Record<string, any>, qq?: Record<string, any>, headers?: Record<string, Record<string, any>>}} options dependencies.
 * @returns {PersonaService} service.
 */
export function makeService(options) {
  return new PersonaService({
    store: options.store,
    getWorkspaceRegistry: () => options.registry,
    getQq: () => options.qq,
    getSessionHeader: sessionId => options.headers?.[sessionId],
  });
}

/**
 * @param {string} directory temp directory.
 * @param {{now?: () => Date|string}} [options] clock.
 * @returns {PersonaStore} store.
 */
export function makeStore(directory, options = {}) {
  return new PersonaStore({ directory, now: options.now });
}

/**
 * Seed a complete valid state in one mutation.  Resolver tests need many cards
 * and bindings quickly; domain tests use service methods instead.
 * @param {PersonaStore} store store.
 * @param {{
 *   workspaceId?: string|null,
 *   core?: string,
 *   injectionEnabled?: boolean,
 *   styles?: Record<string, {name?: string, description?: string, body: string, color?: string}>,
 *   defaultStyle?: string|null,
 *   bindings?: Array<Record<string, any>>,
 * }} spec seed.
 * @returns {Promise<{revision: number, styleIds: Record<string, string>, bindingKeys: string[]}>} seed metadata.
 */
export async function seedState(store, spec = {}) {
  const now = store.nowIso();
  const styleIds = {};
  const styles = {};
  for (const [key, style] of Object.entries(spec.styles ?? {})) {
    const id = `style-${randomUUID()}`;
    styleIds[key] = id;
    styles[id] = makeStyle({
      id,
      name: style.name ?? key,
      description: style.description ?? '',
      body: style.body,
      color: style.color ?? '#6b7280',
      now,
    });
  }
  if (spec.defaultStyle !== undefined && spec.defaultStyle !== null && styleIds[spec.defaultStyle] === undefined) {
    throw new Error('seed default style is unknown');
  }
  const bindings = {};
  for (const specBinding of spec.bindings ?? []) {
    const styleId = specBinding.style === undefined ? null : styleIds[specBinding.style];
    if (specBinding.mode === 'style' && styleId === undefined) {
      throw new Error('seed binding style is unknown');
    }
    const target = specBinding.kind === 'session'
      ? { key: sessionBindingKey(specBinding.sessionId), kind: 'session', sessionId: specBinding.sessionId }
      : { key: qqSceneKey(specBinding.scene), kind: 'qq', scene: structuredClone(specBinding.scene) };
    bindings[target.key] = {
      key: target.key,
      kind: target.kind,
      ...(target.sessionId === undefined ? {} : { sessionId: target.sessionId }),
      ...(target.scene === undefined ? {} : { scene: target.scene }),
      mode: specBinding.mode,
      styleId: styleId ?? null,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
  }
  const result = await store.mutate(store.requireState().revision, {
    action: 'workspace.bind',
    changes: { kind: 'workspace' },
  }, (draft) => {
    draft.workspaceId = spec.workspaceId ?? null;
    draft.injectionEnabled = spec.injectionEnabled ?? true;
    draft.core = {
      body: spec.core ?? '',
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    draft.styles = styles;
    draft.defaultStyleId = spec.defaultStyle === undefined || spec.defaultStyle === null
      ? null
      : styleIds[spec.defaultStyle];
    draft.bindings = bindings;
  });
  return {
    revision: result.state.revision,
    styleIds,
    bindingKeys: Object.keys(bindings),
  };
}

/**
 * @param {string} [start] first timestamp.
 * @returns {() => string} deterministic increasing clock.
 */
export function fixedClock(start = '2026-01-01T00:00:00.000Z') {
  let offset = 0;
  return () => new Date(Date.parse(start) + offset++ * 1000).toISOString();
}
