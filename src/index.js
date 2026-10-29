/**
 * Amadeus Persona v0.1 — Cordis Host plugin.
 *
 * The plugin is Host-global so every Agent assembly can be checked.  It owns
 * exactly two System Prompt sections and a Workspace/QQ-Scene-aware resolver;
 * it never registers tools, selects or recomposes a preset, touches runtime
 * context, reads Memory/Life/State, or changes QQ permissions.
 *
 * Storage lives under DSH_HOME/amadeus-persona (fallback ~/.dsh) unless an
 * absolute `dataDirectory` override is configured.  An empty install writes no
 * file and injects no demo text.
 */

import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { createPersonaHandler, PREFIX } from './http.js';
import { PersonaService } from './service.js';
import { PersonaStore } from './store.js';
import { formatPersonaSection } from './section-text.js';
import { LIMITS } from './validation.js';

export const name = 'amadeus-persona';
export const inject = ['systemPrompt', 'workspaceRegistry'];

/** Ask DSH to start a fresh request series only when the effective Persona changes. */
export function createRequestSeriesRefresh(service, store, registry) {
  const lastPrompt = new Map();
  return async ({ agent }, next) => {
    const decision = await next();
    if (decision?.kind !== 'enter' || !Array.isArray(decision.messages) || decision.messages.length === 0) {
      return decision;
    }
    const sessionId = typeof agent?.id === 'string' ? agent.id : agent?.session?.id;
    if (typeof sessionId !== 'string') return decision;
    let bound = false;
    try {
      const workspaceId = store.requireState().workspaceId;
      bound = registry?.get?.(workspaceId)?.sessionIds?.includes?.(sessionId) === true;
    } catch { /* storage or registry unavailable: keep the Host's decision */ }
    if (!bound && !lastPrompt.has(sessionId)) return decision;
    const resolution = service.resolveForAssembly(agent);
    const fingerprint = createHash('sha256')
      .update(`${resolution.coreText}\u0000${resolution.styleText}`)
      .digest('hex');
    const changed = lastPrompt.get(sessionId) !== fingerprint;
    lastPrompt.delete(sessionId);
    lastPrompt.set(sessionId, fingerprint);
    while (lastPrompt.size > 256) lastPrompt.delete(lastPrompt.keys().next().value);
    return changed ? { ...decision, startsRequestSeries: true } : decision;
  };
}

/**
 * Default isolated data directory.
 * @param {Record<string, string|undefined>} [env] environment.
 * @returns {string} absolute directory.
 */
export function defaultDataDirectory(env = process.env) {
  const dshHome = typeof env?.DSH_HOME === 'string' && env.DSH_HOME.length > 0
    ? env.DSH_HOME
    : join(homedir(), '.dsh');
  return join(dshHome, 'amadeus-persona');
}

/**
 * @param {unknown} raw raw plugin config.
 * @returns {{dataDirectory: string|undefined, maxHistory: number}} normalized config.
 */
export function normalizeConfig(raw) {
  if (raw === undefined || raw === null) return { dataDirectory: undefined, maxHistory: LIMITS.MAX_HISTORY };
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('amadeus-persona config must be an object');
  const config = /** @type {Record<string, unknown>} */ (raw);
  if (config.dataDirectory !== undefined) {
    if (typeof config.dataDirectory !== 'string' || !isAbsolute(config.dataDirectory)) {
      throw new TypeError('amadeus-persona dataDirectory must be an absolute path');
    }
  }
  if (config.maxHistory !== undefined
    && (!Number.isSafeInteger(config.maxHistory) || config.maxHistory < 10 || config.maxHistory > LIMITS.MAX_HISTORY_ON_DISK)) {
    throw new TypeError('amadeus-persona maxHistory must be an integer between 10 and 200');
  }
  return {
    dataDirectory: config.dataDirectory,
    maxHistory: config.maxHistory ?? LIMITS.MAX_HISTORY,
  };
}

/**
 * Read an optional Host service without making it a mount dependency.
 * @param {Record<string, any>} ctx Cordis context.
 * @param {string} service service name.
 * @returns {Record<string, any>|undefined} service.
 */
function optionalService(ctx, service) {
  try {
    if (typeof ctx.get === 'function') {
      const found = ctx.get(service);
      if (found !== undefined) return found;
    }
  } catch {
    // Optional absence or a not-yet-loaded peer is not a mount failure.
  }
  try {
    return ctx[service];
  } catch {
    return undefined;
  }
}

/**
 * Read one live Session header when the Host Session store is available.
 * @param {Record<string, any>} ctx Cordis context.
 * @param {string} sessionId Session id.
 * @returns {Record<string, any>|undefined} header.
 */
function sessionHeader(ctx, sessionId) {
  try {
    const sessions = optionalService(ctx, 'sessions');
    if (!sessions || typeof sessions.get !== 'function') return undefined;
    const session = sessions.get(sessionId);
    return session && typeof session === 'object' ? session.header : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Mount the Host plugin.
 * @param {Record<string, any>} ctx Cordis context.
 * @param {Record<string, any>} [rawConfig] plugin config.
 */
export function apply(ctx, rawConfig = {}) {
  const config = normalizeConfig(rawConfig);
  const directory = config.dataDirectory ?? defaultDataDirectory();
  const store = new PersonaStore({
    directory,
    maxHistory: config.maxHistory,
    logger: ctx.logger,
  });
  const service = new PersonaService({
    store,
    getWorkspaceRegistry: () => {
      try {
        return ctx.workspaceRegistry;
      } catch {
        return undefined;
      }
    },
    getQq: () => optionalService(ctx, 'qq'),
    getMemory: () => optionalService(ctx, 'amadeus.memory'),
    getSessionHeader: sessionId => sessionHeader(ctx, sessionId),
    getAgent: sessionId => {
      try { return ctx.agents?.get?.(sessionId); } catch { return undefined; }
    },
    assemblePrompt: agent => ctx.systemPrompt.assemble({ agent, scope: agent }),
  });

  if (store.health().status !== 'ok') {
    try {
      ctx.logger?.warn?.('amadeus-persona: persona storage is unavailable; injection is fail-closed');
    } catch {
      // Logging must not turn a storage fault into a mount crash.
    }
  }

  // Each assembly context object is fresh. Cache one trust resolution per
  // context so both sections observe the same verified decision, while every
  // new assembly performs a fresh Workspace/QQ check.
  /** @type {WeakMap<object, Record<string, any>>} */
  const resolutions = new WeakMap();
  /**
   * @param {Record<string, any>} context assembly context.
   * @returns {Record<string, any>} resolution.
   */
  const resolve = (context) => {
    const cacheable = context !== null && (typeof context === 'object' || typeof context === 'function');
    if (cacheable && resolutions.has(context)) return resolutions.get(context);
    const resolution = service.resolveForAssembly(context?.agent);
    if (cacheable) resolutions.set(context, resolution);
    return resolution;
  };
  /**
   * @param {Record<string, any>} context assembly context.
   * @param {'core'|'scene'} part section part.
   * @returns {string} section text; never throws.
   */
  const sectionText = (context, part) => {
    try {
      const resolution = resolve(context);
      service.markSectionInvoked(resolution, part);
      return formatPersonaSection(part, part === 'core' ? resolution.coreText : resolution.styleText);
    } catch {
      return '';
    }
  };

  ctx.effect(
    () => ctx.systemPrompt.section({
      name: 'amadeus:core-persona',
      order: 10,
      interpolate: false,
      complete: false,
      text: context => sectionText(context, 'core'),
    }),
    'amadeus-persona: core System Prompt section',
  );
  ctx.effect(
    () => ctx.systemPrompt.section({
      name: 'amadeus:scene-persona',
      // Keep the changing style near the official deployment suffix. The
      // stable core remains near the prefix; tool and policy sections stay in
      // their official order and are never replaced by Persona.
      order: 10190,
      interpolate: false,
      complete: false,
      text: context => sectionText(context, 'scene'),
    }),
    'amadeus-persona: scene System Prompt section',
  );

  // DSH's in-history model routes retain earlier system nodes within one
  // request series. A changed Persona section must start a new series so the
  // official SystemPromptProjection replaces the old system node instead of
  // letting an older style compete with the current one. The Session, preset,
  // tools, user history, and current tool call remain untouched.
  if (typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on('agent/pre-step', createRequestSeriesRefresh(service, store, ctx.workspaceRegistry),
      { prepend: true }), 'amadeus-persona: refresh request series when Persona changes');
  }

  // Native management is an optional Host capability. Without webServer or a
  // DSH Connection the plugin keeps injecting; no unauthenticated surface is
  // created as a fallback.
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['webServer', 'connection'], (child) => {
        try {
          if (!child?.webServer || typeof child.webServer.register !== 'function') return;
          if (typeof child.effect !== 'function') return;
          const handler = createPersonaHandler({
            service,
            getConnection: () => {
              let connection = child.connection;
              if (connection === undefined && typeof child.get === 'function') {
                try { connection = child.get('connection'); } catch { connection = undefined; }
              }
              return connection;
            },
          });
          child.effect(
            () => child.webServer.register({
              kind: 'prefix',
              path: PREFIX,
              handler,
            }),
            'amadeus-persona: owner HTTP API',
          );
        } catch {
          try {
            ctx.logger?.warn?.('amadeus-persona: owner HTTP API is unavailable');
          } catch {
            // Optional diagnostic sink only.
          }
        }
      });
    } catch {
      try {
        ctx.logger?.warn?.('amadeus-persona: owner HTTP API is unavailable');
      } catch {
        // Optional diagnostic sink only.
      }
    }
  }
}

export { PREFIX };
