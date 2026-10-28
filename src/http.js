/**
 * Owner-only Persona HTTP surface.
 *
 * Every request — JSON API and the placeholder console asset alike — must be
 * same-origin, pass `connection.admit(req)`, and resolve to the authenticated
 * DSH Owner principal.  Loopback is never authorization.  POST requests also
 * carry a fixed marker as a CSRF defence.  Error messages are fixed and never
 * reflect request bodies, storage paths, Session ids or QQ Scene ids.
 */

import {
  PersonaValidationError,
  publicFailure,
} from './errors.js';
import {
  CONSOLE_CSS,
  CONSOLE_HTML,
  CONSOLE_JS,
} from './console-assets.js';
import {
  requireExactKeys,
  requireObject,
  requireRevision,
} from './validation.js';

export const PREFIX = '/api/amadeus-persona';
const MAX_BODY_BYTES = 128 * 1024;

/**
 * Console responses deliberately have no inline script or style allowance and
 * no external origins.  The only network destination is this same origin's
 * owner API.  The HTML, CSS and JavaScript routes all receive this policy.
 */
export const CONSOLE_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'none'",
  "media-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
].join('; ');

/**
 * @param {Record<string, any>} req Node request.
 * @returns {boolean} whether Host/Origin state permits a same-origin request.
 */
export function sameOrigin(req) {
  const host = String(req?.headers?.host ?? '');
  if (!host) return false;
  if (req?.headers?.['sec-fetch-site'] === 'cross-site') return false;
  const origin = req?.headers?.origin;
  if (origin === undefined) return true;
  try {
    const parsed = new URL(String(origin));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return parsed.host === host;
  } catch {
    return false;
  }
}

/**
 * @param {import('node:http').ServerResponse} res response.
 * @param {number} status HTTP status.
 * @param {Record<string, unknown>} payload JSON body.
 */
function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'",
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * @param {import('node:http').ServerResponse} res response.
 * @param {string} contentType response media type.
 * @param {string} body console asset.
 */
function sendConsoleAsset(res, contentType, body) {
  res.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'cross-origin-resource-policy': 'same-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': CONSOLE_CSP,
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * @param {import('node:http').ServerResponse} res response.
 * @param {number} status HTTP status.
 * @param {string} code machine code.
 * @param {string} message fixed human message.
 */
function fail(res, status, code, message) {
  return send(res, status, { ok: false, code, error: message });
}

/**
 * @param {Record<string, any>|undefined} connection DSH Connection service.
 * @param {Record<string, any>} req Node request.
 * @returns {{ok: true}|{ok: false, status: number, code: string, message: string}} decision.
 */
export function authorizeRequest(connection, req) {
  if (!connection || typeof connection.admit !== 'function') {
    return {
      ok: false,
      status: 503,
      code: 'PERSONA_MANAGEMENT_UNAVAILABLE',
      message: 'native Persona management requires the DSH Connection service',
    };
  }
  let admission;
  try {
    admission = connection.admit(req);
  } catch {
    return { ok: false, status: 403, code: 'PERSONA_AUTH_REQUIRED', message: 'request authentication failed' };
  }
  if (!admission || admission.rejection !== undefined) {
    const rejection = Number(admission?.rejection);
    const status = Number.isInteger(rejection) && rejection >= 400 && rejection <= 599 ? rejection : 403;
    return { ok: false, status, code: 'PERSONA_AUTH_REQUIRED', message: 'DSH authentication is required' };
  }
  if (admission?.peer?.principal?.kind !== 'owner') {
    return {
      ok: false,
      status: 403,
      code: 'PERSONA_AUTH_REQUIRED',
      message: 'only the authenticated owner may manage Persona',
    };
  }
  return { ok: true };
}

/**
 * @param {import('node:http').IncomingMessage} req Node request.
 * @returns {Promise<Record<string, unknown>>} parsed JSON object.
 */
async function readBody(req) {
  const contentType = String(req?.headers?.['content-type'] ?? '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    throw new PersonaValidationError('POST requests require application/json');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new PersonaValidationError('request body is too large');
    chunks.push(chunk);
  }
  if (size === 0) throw new PersonaValidationError('request body is required');
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new PersonaValidationError('request body must be valid JSON');
  }
  return requireObject(parsed, 'request');
}

/**
 * @param {URL} url parsed URL.
 * @param {string} name query parameter.
 * @returns {string} required value.
 */
function query(url, name) {
  const value = url.searchParams.get(name);
  if (typeof value !== 'string' || value.length === 0) {
    throw new PersonaValidationError(`${name} is required`);
  }
  return value;
}

/**
 * @param {Record<string, any>} body request body.
 * @returns {number} expected global revision.
 */
function expectedRevision(body) {
  return requireRevision(body.expectedRevision, 'expectedRevision');
}

/**
 * @param {string} value URL segment.
 * @returns {string} decoded segment.
 */
function decodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new PersonaValidationError('URL segment is invalid');
  }
}

/**
 * Create the Host HTTP handler.
 * @param {{
 *   service: import('./service.js').PersonaService,
 *   getConnection?: () => Record<string, any>|undefined,
 *   consoleHtml?: string,
 *   consoleCss?: string,
 *   consoleJs?: string,
 * }} options handler dependencies.
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>} handler.
 */
export function createPersonaHandler(options) {
  const service = options?.service;
  if (!service || typeof service.overview !== 'function' || typeof service.resolveForAssembly !== 'function') {
    throw new TypeError('createPersonaHandler requires a PersonaService');
  }
  const getConnection = typeof options.getConnection === 'function' ? options.getConnection : () => undefined;
  const consoleHtml = typeof options.consoleHtml === 'string' ? options.consoleHtml : CONSOLE_HTML;
  const consoleCss = typeof options.consoleCss === 'string' ? options.consoleCss : CONSOLE_CSS;
  const consoleJs = typeof options.consoleJs === 'string' ? options.consoleJs : CONSOLE_JS;

  return async function personaHandler(req, res) {
    const url = new URL(String(req?.url ?? '/'), 'http://localhost');
    if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) {
      return fail(res, 404, 'PERSONA_ENDPOINT_UNKNOWN', 'not found');
    }
    if (!sameOrigin(req)) {
      return fail(res, 403, 'PERSONA_AUTH_REQUIRED', 'same-origin request required');
    }
    if (req.method === 'POST' && req.headers?.['x-amadeus-persona'] !== '1') {
      return fail(res, 403, 'PERSONA_AUTH_REQUIRED', 'missing Persona management request marker');
    }
    let connection;
    try {
      connection = getConnection();
    } catch {
      connection = undefined;
    }
    const auth = authorizeRequest(connection, req);
    if (!auth.ok) return send(res, auth.status, { ok: false, code: auth.code, error: auth.message });

    const path = url.pathname.slice(PREFIX.length) || '/';
    try {
      if (req.method === 'GET') {
        if (path === '/console' || path === '/console/') {
          return sendConsoleAsset(res, 'text/html; charset=utf-8', consoleHtml);
        }
        if (path === '/console/console.css') {
          return sendConsoleAsset(res, 'text/css; charset=utf-8', consoleCss);
        }
        if (path === '/console/console.js') {
          return sendConsoleAsset(res, 'text/javascript; charset=utf-8', consoleJs);
        }
        if (path === '/overview') return send(res, 200, { ok: true, data: service.overview() });
        if (path === '/workspaces') return send(res, 200, { ok: true, data: service.listWorkspaces() });
        if (path === '/cards') return send(res, 200, { ok: true, data: service.getCards() });
        if (path === '/bindings') return send(res, 200, { ok: true, data: service.getBindings() });
        if (path === '/history') {
          const cardType = query(url, 'cardType');
          const cardId = cardType === 'style' ? query(url, 'cardId') : null;
          return send(res, 200, { ok: true, data: service.getHistory(cardType, cardId) });
        }
        if (path === '/backups') return send(res, 200, { ok: true, data: await service.getBackups() });
        if (path === '/diagnostics') return send(res, 200, { ok: true, data: service.diagnostics() });
        if (path === '/diagnostics/final') {
          return send(res, 200, { ok: true, data: await service.probeFinalVisibility(query(url, 'sessionId')) });
        }
        return fail(res, 404, 'PERSONA_ENDPOINT_UNKNOWN', 'unknown Persona endpoint');
      }

      if (req.method !== 'POST') {
        return fail(res, 405, 'PERSONA_METHOD_NOT_ALLOWED', 'method not allowed');
      }

      const body = await readBody(req);

      if (path === '/workspace') {
        requireExactKeys(body, ['expectedRevision', 'workspaceId'], [], 'request');
        if (body.workspaceId !== null && typeof body.workspaceId !== 'string') {
          throw new PersonaValidationError('workspaceId must be a string or null');
        }
        return send(res, 200, {
          ok: true,
          data: await service.bindWorkspace(expectedRevision(body), body.workspaceId),
        });
      }
      if (path === '/settings') {
        requireExactKeys(body, ['expectedRevision', 'injectionEnabled'], [], 'request');
        if (typeof body.injectionEnabled !== 'boolean') {
          throw new PersonaValidationError('injectionEnabled must be a boolean');
        }
        return send(res, 200, {
          ok: true,
          data: await service.setInjectionEnabled(expectedRevision(body), body.injectionEnabled),
        });
      }
      if (path === '/cards/core') {
        requireExactKeys(body, ['expectedRevision', 'body'], [], 'request');
        return send(res, 200, {
          ok: true,
          data: await service.updateCore(expectedRevision(body), body.body),
        });
      }
      if (path === '/cards/styles') {
        requireExactKeys(body, ['expectedRevision', 'name', 'body'], ['description', 'color'], 'request');
        return send(res, 200, {
          ok: true,
          data: await service.createStyle(expectedRevision(body), {
            name: body.name,
            body: body.body,
            description: body.description,
            color: body.color,
          }),
        });
      }
      if (path === '/default-style') {
        requireExactKeys(body, ['expectedRevision', 'styleId'], [], 'request');
        if (body.styleId !== null && typeof body.styleId !== 'string') {
          throw new PersonaValidationError('styleId must be a string or null');
        }
        return send(res, 200, {
          ok: true,
          data: await service.setDefaultStyle(expectedRevision(body), body.styleId),
        });
      }
      if (path === '/bindings') {
        requireExactKeys(
          body,
          ['expectedRevision', 'kind', 'mode'],
          ['styleId', 'sessionId', 'scene'],
          'request',
        );
        return send(res, 200, {
          ok: true,
          data: await service.upsertBinding(expectedRevision(body), {
            kind: body.kind,
            mode: body.mode,
            styleId: body.styleId,
            sessionId: body.sessionId,
            scene: body.scene,
          }),
        });
      }
      if (path === '/bindings/delete') {
        requireExactKeys(body, ['expectedRevision', 'key'], [], 'request');
        return send(res, 200, {
          ok: true,
          data: await service.deleteBinding(expectedRevision(body), body.key),
        });
      }
      if (path === '/history/rollback') {
        requireExactKeys(body, ['expectedRevision', 'cardType', 'historyId'], ['cardId'], 'request');
        return send(res, 200, {
          ok: true,
          data: await service.rollback(expectedRevision(body), {
            cardType: body.cardType,
            cardId: body.cardId,
            historyId: body.historyId,
          }),
        });
      }
      if (path === '/backup') {
        requireExactKeys(body, ['expectedRevision'], ['reason'], 'request');
        return send(res, 200, {
          ok: true,
          data: await service.backup(expectedRevision(body), body.reason),
        });
      }
      if (path === '/restore') {
        requireExactKeys(body, ['expectedRevision', 'backupId', 'confirm'], [], 'request');
        return send(res, 200, {
          ok: true,
          data: await service.restore(expectedRevision(body), body.backupId, body.confirm),
        });
      }

      const styleMatch = /^\/cards\/styles\/([^/]+)(?:\/(delete|copy))?$/.exec(path);
      if (styleMatch !== null) {
        const styleId = decodeSegment(styleMatch[1]);
        const suffix = styleMatch[2];
        if (suffix === 'delete') {
          requireExactKeys(body, ['expectedRevision'], [], 'request');
          return send(res, 200, {
            ok: true,
            data: await service.deleteStyle(expectedRevision(body), styleId),
          });
        }
        if (suffix === 'copy') {
          requireExactKeys(body, ['expectedRevision'], ['name'], 'request');
          return send(res, 200, {
            ok: true,
            data: await service.copyStyle(expectedRevision(body), styleId, { name: body.name }),
          });
        }
        requireExactKeys(body, ['expectedRevision'], ['name', 'description', 'body', 'color'], 'request');
        return send(res, 200, {
          ok: true,
          data: await service.updateStyle(expectedRevision(body), styleId, {
            ...(Object.hasOwn(body, 'name') ? { name: body.name } : {}),
            ...(Object.hasOwn(body, 'description') ? { description: body.description } : {}),
            ...(Object.hasOwn(body, 'body') ? { body: body.body } : {}),
            ...(Object.hasOwn(body, 'color') ? { color: body.color } : {}),
          }),
        });
      }

      return fail(res, 404, 'PERSONA_ENDPOINT_UNKNOWN', 'unknown Persona endpoint');
    } catch (error) {
      const failure = publicFailure(error);
      return send(res, failure.status, {
        ok: false,
        code: failure.code,
        error: failure.message,
        ...(failure.currentRevision === undefined ? {} : { currentRevision: failure.currentRevision }),
        ...(failure.details === undefined ? {} : { details: failure.details }),
      });
    }
  };
}

/** Exported for focused tests. */
export const __httpInternals = { MAX_BODY_BYTES, readBody };
